import type { Runtime, Session } from '../runtime/types.js'
import type { AIToolLauncher, LaunchConfig } from '../launcher/types.js'
import type { ScenarioConfig } from '../scenario/types.js'
import { toStoredSession } from './types.js'
import { saveSession, deleteSession } from './store.js'
import { join } from 'node:path'

/** Manages the lifecycle of an interview session */
export class SessionManager {
  constructor(
    private runtime: Runtime,
    private launcher: AIToolLauncher,
  ) {}

  /** Create and start a full interview session */
  async createSession(
    scenario: ScenarioConfig,
    scenarioPath: string,
    _launchConfig: Partial<LaunchConfig> = {},
  ): Promise<Session> {
    // Create the environment (Docker container + workspace)
    const session = await this.runtime.create(scenario, scenarioPath)

    // Save session to disk for tracking
    await saveSession(toStoredSession(session))

    // Start the environment
    await this.runtime.start(session)
    await saveSession(toStoredSession(session))

    return session
  }

  /** Launch the AI tool for a running session */
  async launchAITool(
    session: Session,
    scenario: ScenarioConfig,
    launchConfig: Partial<LaunchConfig> = {},
  ): Promise<{ exitCode: number }> {
    const workdir = this.runtime.getWorkdir(session)

    // System prompt is stored outside the workspace
    const workdirParent = join(workdir, '..')
    const systemPromptPath = join(workdirParent, 'system-prompt.md')

    // Build allowed tools from the scenario's commands list.
    // Each command in the scenario gets a Bash(<cmd>:*) permission
    // so Claude Code can run e.g. `npm test` without prompting.
    const allowedTools = buildAllowedTools(scenario.environment.commands)

    const config: LaunchConfig = {
      scenarioName: session.scenarioName,
      systemPromptPath,
      allowedTools,
      ...launchConfig,
    }

    session.aiTool = this.launcher.name
    session.startedAt = new Date().toISOString()
    await saveSession(toStoredSession(session))

    // Launch and wait for the AI tool to exit
    const process = await this.launcher.launch(workdir, config)
    return process.wait()
  }

  /** Destroy a session */
  async destroySession(session: Session): Promise<void> {
    await this.runtime.destroy(session)
    await deleteSession(session.id)
  }

  /** Get elapsed time since the AI tool was launched */
  getElapsedTime(session: Session): string | null {
    if (!session.startedAt) return null

    const elapsed = Date.now() - new Date(session.startedAt).getTime()
    const minutes = Math.floor(elapsed / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)

    if (minutes === 0) return `${seconds}s`
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Generate Claude Code --allowedTools from the scenario commands list.
 *
 * For each wrapper command (npm, node, curl, etc.) we allow:
 *   Bash(npm:*)  — auto-approve any bash invocation starting with `npm`
 *
 * We also always allow the .vibe/bin/vibe-exec catch-all wrapper and
 * standard file operations (Read, Edit, Write, etc.) so the candidate
 * can work without constant permission prompts.
 */
function buildAllowedTools(commands: string[]): string[] {
  const tools: string[] = []

  // Allow each wrapper command
  for (const cmd of commands) {
    tools.push(`Bash(${cmd}:*)`)
  }

  // Allow the catch-all vibe-exec wrapper
  tools.push('Bash(vibe-exec:*)')
  tools.push('Bash(.vibe/bin/vibe-exec:*)')

  // Allow common read-only / edit operations so the candidate
  // can navigate and modify code freely
  tools.push('Read', 'Edit', 'Write', 'Glob', 'Grep')

  // Allow cat/ls/pwd/echo for basic shell navigation
  tools.push('Bash(cat:*)', 'Bash(ls:*)', 'Bash(pwd:*)', 'Bash(echo:*)')
  tools.push('Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)', 'Bash(find:*)')
  tools.push('Bash(grep:*)', 'Bash(which:*)', 'Bash(env:*)')

  return tools
}
