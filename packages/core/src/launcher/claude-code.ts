import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import type { AIToolLauncher, LaunchConfig, LaunchedProcess } from './types.js'

const execFileAsync = promisify(execFile)

export class ClaudeCodeLauncher implements AIToolLauncher {
  readonly name = 'claude-code'
  readonly displayName = 'Claude Code'

  async isInstalled(): Promise<boolean> {
    try {
      await execFileAsync('claude', ['--version'])
      return true
    } catch {
      return false
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('claude', ['--version'])
      return stdout.trim()
    } catch {
      return null
    }
  }

  async launch(workdir: string, config: LaunchConfig): Promise<LaunchedProcess> {
    const args: string[] = []

    // Inject hidden system prompt — read file and pass inline
    // to avoid any issues with file path resolution
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

    // Allow specific tools — wrapper commands get auto-approved
    if (config.allowedTools && config.allowedTools.length > 0) {
      args.push('--allowedTools', ...config.allowedTools)
    }

    // Disallow tools for fairness
    if (config.disallowedTools && config.disallowedTools.length > 0) {
      args.push('--disallowedTools', ...config.disallowedTools)
    }

    // Spawn claude process
    const proc = spawn('claude', args, {
      cwd: workdir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...config.env,
        // Prepend .vibe/bin to PATH for transparent command wrapping
        PATH: `${workdir}/.vibe/bin:${process.env['PATH'] ?? ''}`,
      },
    })

    return {
      wait: () =>
        new Promise((resolve) => {
          proc.on('exit', (code) => resolve({ exitCode: code ?? 0 }))
        }),
      kill: async () => {
        proc.kill('SIGTERM')
      },
    }
  }
}
