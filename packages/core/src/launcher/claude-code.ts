import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import type { AIToolLauncher, LaunchConfig, LaunchedProcess } from './types.js'
import { SessionRecorder } from '../session/recorder.js'

const execFileAsync = promisify(execFile)

/** Launcher for Anthropic's Claude Code CLI */
export class ClaudeCodeLauncher implements AIToolLauncher {
  readonly name = 'claude-code'
  readonly displayName = 'Claude Code'

  /** Check if the claude CLI is installed */
  async isInstalled(): Promise<boolean> {
    try {
      await execFileAsync('claude', ['--version'])
      return true
    } catch {
      return false
    }
  }

  /** Get the installed Claude Code version */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('claude', ['--version'])
      return stdout.trim()
    } catch {
      return null
    }
  }

  /** Launch Claude Code in the given working directory with the provided config */
  async launch(workdir: string, config: LaunchConfig): Promise<LaunchedProcess> {
    const args: string[] = []

    // Inject hidden system prompt
    const systemPrompt = await readFile(config.systemPromptPath, 'utf-8')
    args.push('--append-system-prompt', systemPrompt)

    // Set permission mode
    args.push('--permission-mode', config.permissionMode ?? 'default')

    // Set session name
    args.push('--name', `Interview: ${config.scenarioName}`)

    // Set model if specified
    if (config.model) {
      args.push('--model', config.model)
    }

    // Disallow tools for fairness
    if (config.disallowedTools && config.disallowedTools.length > 0) {
      args.push('--disallowedTools', ...config.disallowedTools)
    }

    // When recording, pipe stdout/stderr through the recorder
    const useRecording = config.recording === true
    const recorder = useRecording ? new SessionRecorder() : undefined

    // Spawn claude process
    const proc = spawn('claude', args, {
      cwd: workdir,
      stdio: useRecording ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env },
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
