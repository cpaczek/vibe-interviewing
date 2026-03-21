import Docker from 'dockerode'
import { randomUUID } from 'node:crypto'
import { mkdtemp, cp, writeFile, mkdir, rm } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { DockerNotFoundError, DockerNotRunningError, HealthCheckFailedError } from '../errors.js'
import type { Runtime, Session, ExecResult } from './types.js'
import type { ScenarioConfig } from '../scenario/types.js'
import { resolveVibeDir, getCodebasePath } from '../scenario/loader.js'
import { generateWrapperScripts } from './wrappers.js'

const execFileAsync = promisify(execFile)
const CONTAINER_WORKDIR = '/app'

function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)(s|ms)$/)
  if (!match) return 2000
  const [, value, unit] = match
  return parseInt(value!, 10) * (unit === 's' ? 1000 : 1)
}

export class DockerRuntime implements Runtime {
  readonly name = 'docker'
  private docker: Docker

  constructor() {
    this.docker = new Docker()
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    try {
      await this.docker.ping()
      return { available: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('ENOENT') || message.includes('not found')) {
        throw new DockerNotFoundError()
      }
      throw new DockerNotRunningError()
    }
  }

  async create(scenario: ScenarioConfig, scenarioPath: string): Promise<Session> {
    const sessionId = randomUUID().slice(0, 8)
    const workdir = await mkdtemp(join(tmpdir(), `vibe-${sessionId}-`))
    const workspacePath = join(workdir, 'workspace')
    await mkdir(workspacePath, { recursive: true })

    // Copy codebase to workspace (EXCLUDING .vibe/ directory)
    const codebasePath = getCodebasePath(scenarioPath)
    await cp(codebasePath, workspacePath, {
      recursive: true,
      filter: (src) => !src.includes('/.vibe/') && !src.includes('\\.vibe\\'),
    })

    // Write BRIEFING.md into workspace
    await writeFile(
      join(workspacePath, 'BRIEFING.md'),
      `# ${scenario.name}\n\n${scenario.briefing}`,
    )

    // Write CLAUDE.md with safe, visible context
    const claudeMd = this.buildClaudeMd(scenario, sessionId)
    await writeFile(join(workspacePath, 'CLAUDE.md'), claudeMd)

    // Write system prompt to a temp location OUTSIDE the workspace
    const systemPromptPath = join(workdir, 'system-prompt.md')
    const { generateSystemPrompt } = await import('../scenario/loader.js')
    const systemPrompt = generateSystemPrompt(scenario)
    await writeFile(systemPromptPath, systemPrompt)

    // Generate .vibe/bin/ wrapper scripts
    if (scenario.environment.commands.length > 0) {
      await generateWrapperScripts(workspacePath, scenario.environment.commands, sessionId)
    }

    // Build or pull Docker image
    const vibeDir = resolveVibeDir(scenarioPath)
    let imageTag = `vibe-${sessionId}`

    if (scenario.environment.dockerfile) {
      const dockerfilePath = join(vibeDir, scenario.environment.dockerfile)
      if (existsSync(dockerfilePath)) {
        await this.buildImage(dockerfilePath, imageTag)
      }
    } else if (scenario.environment.image) {
      imageTag = scenario.environment.image
      await this.pullImage(imageTag)
    }

    return {
      id: sessionId,
      scenarioName: scenario.name,
      scenarioPath,
      status: 'creating',
      workdir: workspacePath,
      ports: {},
      createdAt: new Date().toISOString(),
    }
  }

  async start(session: Session): Promise<void> {
    const config = (await import('../scenario/loader.js')).loadScenarioConfig
    const scenario = await config(session.scenarioPath)

    const containerName = `vibe-${session.id}`
    const imageTag = scenario.environment.image ?? `vibe-${session.id}`

    // Parse port bindings
    const portBindings: Record<string, Array<{ HostPort: string }>> = {}
    const exposedPorts: Record<string, Record<string, never>> = {}
    for (const portMapping of scenario.environment.ports) {
      const [hostPort, containerPort] = portMapping.split(':')
      if (hostPort && containerPort) {
        exposedPorts[`${containerPort}/tcp`] = {}
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort }]
        session.ports[parseInt(hostPort, 10)] = parseInt(containerPort, 10)
      }
    }

    // Create and start container with workspace volume mount
    // The container keeps running via tail -f (the app is started by setup_commands or healthcheck)
    const container = await this.docker.createContainer({
      name: containerName,
      Image: imageTag,
      WorkingDir: CONTAINER_WORKDIR,
      Cmd: ['tail', '-f', '/dev/null'],
      Env: Object.entries(scenario.environment.env).map(([k, v]) => `${k}=${v}`),
      ExposedPorts: exposedPorts,
      HostConfig: {
        Binds: [`${session.workdir}:${CONTAINER_WORKDIR}`],
        PortBindings: portBindings,
      },
    })

    await container.start()
    session.containerId = container.id
    session.status = 'running'

    // Run setup commands
    for (const cmd of scenario.environment.setup_commands) {
      const result = await this.exec(session, cmd)
      if (result.exitCode !== 0) {
        throw new Error(`Setup command failed: ${cmd}\n${result.stdout}\n${result.stderr}`)
      }
    }

    // Start the app in the background if there's a healthcheck
    // (implies the scenario expects a running server)
    if (scenario.environment.healthcheck) {
      // Start the default process in the background
      const startCmd = this.detectStartCommand(scenario)
      if (startCmd) {
        await this.exec(session, `nohup ${startCmd} > /tmp/app.log 2>&1 &`)
      }

      await this.waitForHealthCheck(
        session,
        scenario.environment.healthcheck.command,
        parseInterval(scenario.environment.healthcheck.interval),
        scenario.environment.healthcheck.retries,
      )
    }
  }

  async exec(session: Session, command: string): Promise<ExecResult> {
    if (!session.containerId) {
      return { exitCode: 1, stdout: '', stderr: 'No container running' }
    }

    const container = this.docker.getContainer(session.containerId)
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    })

    const stream = await exec.start({ hijack: true, stdin: false })
    let stdout = ''
    let stderr = ''

    return new Promise((resolve) => {
      // Docker multiplexes stdout/stderr with 8-byte headers per frame:
      //   byte 0: stream type (1=stdout, 2=stderr)
      //   bytes 1-3: padding
      //   bytes 4-7: frame size (big-endian uint32)
      const parseMultiplexed = (data: Buffer): void => {
        let offset = 0
        while (offset < data.length) {
          if (offset + 8 > data.length) {
            // Incomplete header — treat remainder as stdout
            stdout += data.subarray(offset).toString()
            break
          }
          const streamType = data[offset]
          const frameSize = data.readUInt32BE(offset + 4)
          offset += 8

          const end = Math.min(offset + frameSize, data.length)
          const text = data.subarray(offset, end).toString()

          if (streamType === 2) {
            stderr += text
          } else {
            stdout += text
          }
          offset = end
        }
      }

      stream.on('data', (chunk: Buffer) => {
        parseMultiplexed(chunk)
      })
      stream.on('end', async () => {
        const inspect = await exec.inspect()
        resolve({
          exitCode: inspect.ExitCode ?? 1,
          stdout,
          stderr,
        })
      })
    })
  }

  getWorkdir(session: Session): string {
    return session.workdir
  }

  async destroy(session: Session): Promise<void> {
    session.status = 'stopping'

    if (session.containerId) {
      try {
        const container = this.docker.getContainer(session.containerId)
        await container.stop({ t: 5 }).catch(() => {})
        await container.remove({ force: true }).catch(() => {})
      } catch {
        // Container may already be removed
      }
    }

    // Clean up temp directory
    const workdirParent = join(session.workdir, '..')
    await rm(workdirParent, { recursive: true, force: true }).catch(() => {})

    session.status = 'destroyed'
  }

  private async buildImage(dockerfilePath: string, tag: string): Promise<void> {
    // Use docker CLI directly — more reliable than dockerode's build API
    // which requires constructing tar archives
    const dir = join(dockerfilePath, '..')
    const file = basename(dockerfilePath)
    await execFileAsync('docker', ['build', '-t', tag, '-f', file, '.'], {
      cwd: dir,
    })
  }

  private async pullImage(image: string): Promise<void> {
    const stream = await this.docker.pull(image)
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private async waitForHealthCheck(
    session: Session,
    command: string,
    intervalMs: number,
    retries: number,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      const result = await this.exec(session, command)
      if (result.exitCode === 0) return
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new HealthCheckFailedError(command, retries)
  }

  /** Detect the start command from the scenario's Dockerfile or common patterns */
  private detectStartCommand(scenario: ScenarioConfig): string | null {
    // Check for common patterns based on environment
    const commands = scenario.environment.commands
    if (commands.includes('npm')) {
      return 'npm start'
    }
    if (commands.includes('python') || commands.includes('pip')) {
      // Check for uvicorn (FastAPI)
      return 'uvicorn src.main:app --host 0.0.0.0 --port 8000'
    }
    return null
  }

  private buildClaudeMd(scenario: ScenarioConfig, _sessionId: string): string {
    const lines: string[] = []
    lines.push('# Interview Environment')
    lines.push('')

    if (scenario.environment.commands.length > 0) {
      lines.push('Commands are configured to run in the interview environment automatically.')
      lines.push(`Use ${scenario.environment.commands.join(', ')} normally.`)
      lines.push('For other commands, use `.vibe/bin/vibe-exec <command>`.')
    }

    lines.push('')
    lines.push('The project source code is in this directory. Edit files directly.')
    lines.push('The briefing is in BRIEFING.md.')

    return lines.join('\n')
  }
}
