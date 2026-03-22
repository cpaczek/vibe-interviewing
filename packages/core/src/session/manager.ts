import { execSync } from 'node:child_process'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomBytes } from 'node:crypto'
import type { AIToolLauncher, LaunchConfig } from '../launcher/types.js'
import type { ScenarioConfig } from '../scenario/types.js'
import { importRepo } from '../scenario/importer.js'
import { generateSystemPrompt } from '../scenario/loader.js'
import { SetupError } from '../errors.js'
import { saveSession, deleteSession } from './store.js'
import { toStoredSession } from './types.js'
import type { Session } from './types.js'

export type { Session }

/** Callback for reporting session progress */
export type ProgressCallback = (stage: string) => void

/** Manages the lifecycle of an interview session */
export class SessionManager {
  constructor(private launcher: AIToolLauncher) {}

  /**
   * Create a new interview session.
   *
   * Flow:
   * 1. Clone the repo at a pinned commit
   * 2. Apply bug patches (find/replace in source files)
   * 3. Wipe git history so the candidate can't diff to find the bug
   * 4. Remove scenario.yaml from workspace (interviewer-only)
   * 5. Write BRIEFING.md and system prompt
   * 6. Run setup commands (npm install, etc.)
   */
  async createSession(
    config: ScenarioConfig,
    workdir?: string,
    onProgress?: ProgressCallback,
    options?: { skipSetup?: boolean },
  ): Promise<{ session: Session; config: ScenarioConfig }> {
    const id = randomBytes(4).toString('hex')
    const sessionDir = workdir ?? join(homedir(), 'vibe-sessions', `${config.name}-${id}`)

    const session: Session = {
      id,
      scenarioName: config.name,
      workdir: sessionDir,
      systemPromptPath: '',
      status: 'cloning',
      createdAt: new Date().toISOString(),
    }

    // 1. Clone the repo at the pinned commit
    onProgress?.('Cloning repository...')
    await importRepo(config.repo, sessionDir, config.commit)

    // 2. Apply bug patches
    onProgress?.('Injecting scenario...')
    for (const p of config.patch) {
      const filePath = join(sessionDir, p.file)
      const content = await readFile(filePath, 'utf-8')
      const patched = content.replaceAll(p.find, p.replace)
      if (patched === content) {
        throw new SetupError(
          `patch ${p.file}`,
          `Could not find text to replace. The upstream code may have changed.`,
        )
      }
      await writeFile(filePath, patched)
    }

    // 3. Wipe git history so candidate can't see the injected changes
    onProgress?.('Preparing workspace...')
    await rm(join(sessionDir, '.git'), { recursive: true, force: true })
    execSync(
      'git init && git add -A && git -c user.name=vibe -c user.email=vibe@local commit -m "initial"',
      { cwd: sessionDir, stdio: 'ignore' },
    )

    // 4. Remove scenario.yaml from workspace (interviewer-only data)
    await rm(join(sessionDir, 'scenario.yaml'), { force: true })

    // 5. Write BRIEFING.md
    await writeFile(join(sessionDir, 'BRIEFING.md'), `# Interview Briefing\n\n${config.briefing}`)

    // Write system prompt OUTSIDE the workspace
    const promptDir = join(homedir(), '.vibe-interviewing', 'prompts')
    await mkdir(promptDir, { recursive: true })
    const systemPromptPath = join(promptDir, `${id}.md`)
    await writeFile(systemPromptPath, generateSystemPrompt(config))
    session.systemPromptPath = systemPromptPath

    // 6. Run setup commands (skip when hosting — candidate runs setup after download)
    if (!options?.skipSetup) {
      session.status = 'setting-up'
      for (const cmd of config.setup) {
        onProgress?.(`Running: ${cmd}`)
        try {
          execSync(cmd, { cwd: sessionDir, stdio: 'pipe', timeout: 300000 })
        } catch (err) {
          throw new SetupError(cmd, err instanceof Error ? err.message : String(err))
        }
      }
    }

    session.status = 'running'
    await saveSession(toStoredSession(session))
    return { session, config }
  }

  /** Launch the AI coding tool for an active session */
  async launchAITool(
    session: Session,
    _config: ScenarioConfig,
    launchConfig: Partial<LaunchConfig> = {},
  ): Promise<{ exitCode: number }> {
    const fullConfig: LaunchConfig = {
      scenarioName: session.scenarioName,
      systemPromptPath: session.systemPromptPath,
      ...launchConfig,
    }

    session.aiTool = this.launcher.name
    session.startedAt = new Date().toISOString()
    await saveSession(toStoredSession(session))

    const proc = await this.launcher.launch(session.workdir, fullConfig)
    const result = await proc.wait()

    session.status = 'complete'
    session.completedAt = new Date().toISOString()
    await saveSession(toStoredSession(session))

    return result
  }

  /** Destroy a session by removing its stored data */
  async destroySession(session: Session): Promise<void> {
    await deleteSession(session.id)
  }

  /** Get elapsed time since the AI tool was launched, formatted as a human-readable string */
  getElapsedTime(session: Session): string | null {
    if (!session.startedAt) return null

    const elapsed = Date.now() - new Date(session.startedAt).getTime()
    const minutes = Math.floor(elapsed / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)

    if (minutes === 0) return `${seconds}s`
    return `${minutes}m ${seconds}s`
  }
}
