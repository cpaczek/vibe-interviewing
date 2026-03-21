import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AIToolLauncher, LaunchConfig, LaunchedProcess } from './types.js'
import { SessionRecorder } from '../session/recorder.js'

const execFileAsync = promisify(execFile)

export class OpenCodeLauncher implements AIToolLauncher {
  readonly name = 'open-code'
  readonly displayName = 'Open Code'

  async isInstalled(): Promise<boolean> {
    try {
      await execFileAsync('opencode', ['--version'])
      return true
    } catch {
      return false
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('opencode', ['--version'])
      return stdout.trim()
    } catch {
      return null
    }
  }

  async launch(workdir: string, config: LaunchConfig): Promise<LaunchedProcess> {
    // Write opencode.json config
    const opencodeConfig = {
      model: config.model ?? 'anthropic/claude-sonnet-4-6',
    }
    await writeFile(join(workdir, 'opencode.json'), JSON.stringify(opencodeConfig, null, 2))

    // Write AGENTS.md — Open Code cannot hide instructions from the candidate,
    // so we include the system prompt content here as a known tradeoff.
    const systemPrompt = await readFile(config.systemPromptPath, 'utf-8')
    const agentsMd = [`# Interview Scenario: ${config.scenarioName}`, '', systemPrompt].join('\n')

    await writeFile(join(workdir, 'AGENTS.md'), agentsMd)

    // When recording, pipe stdout/stderr through the recorder
    const useRecording = config.recording === true
    const recorder = useRecording ? new SessionRecorder() : undefined

    // Spawn opencode TUI
    const proc = spawn('opencode', [], {
      cwd: workdir,
      stdio: useRecording ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      env: {
        ...process.env,
        ...config.env,
        PATH: `${workdir}/.vibe/bin:${process.env['PATH'] ?? ''}`,
      },
    })

    // Forward piped output to the terminal and record it
    if (useRecording && recorder) {
      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        recorder.record('stdout', text)
        process.stdout.write(chunk)
      })

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        recorder.record('stderr', text)
        process.stderr.write(chunk)
      })
    }

    return {
      wait: () =>
        new Promise((resolve) => {
          proc.on('exit', (code) => resolve({ exitCode: code ?? 0 }))
        }),
      kill: async () => {
        proc.kill('SIGTERM')
      },
      recorder,
    }
  }
}
