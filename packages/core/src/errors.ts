/** Base error class for all vibe-interviewing errors */
export class VibeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = 'VibeError'
  }
}

export class ScenarioNotFoundError extends VibeError {
  constructor(name: string) {
    super(
      `Scenario not found: ${name}`,
      'SCENARIO_NOT_FOUND',
      'Run `vibe-interviewing list` to see available scenarios',
    )
  }
}

export class ScenarioValidationError extends VibeError {
  constructor(
    message: string,
    public readonly issues: string[],
  ) {
    super(`Invalid scenario config: ${message}`, 'SCENARIO_VALIDATION_ERROR', issues.join('\n'))
  }
}

export class AIToolNotFoundError extends VibeError {
  static readonly installHints: Record<string, string> = {
    'claude-code': 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
  }

  constructor(tool: string) {
    super(
      `${tool} is not installed`,
      'AI_TOOL_NOT_FOUND',
      AIToolNotFoundError.installHints[tool] ?? `Install ${tool} and try again`,
    )
  }
}

export class SessionNotFoundError extends VibeError {
  constructor(id: string) {
    super(
      `Session not found: ${id}`,
      'SESSION_NOT_FOUND',
      'Run `vibe-interviewing list` to see active sessions',
    )
  }
}

export class GitCloneError extends VibeError {
  constructor(repo: string, reason?: string) {
    super(
      `Failed to clone repository: ${repo}${reason ? ` — ${reason}` : ''}`,
      'GIT_CLONE_FAILED',
      'Check the repo URL and your network connection',
    )
  }
}

export class SetupError extends VibeError {
  constructor(command: string, reason?: string) {
    super(
      `Setup command failed: ${command}${reason ? ` — ${reason}` : ''}`,
      'SETUP_FAILED',
      'Check the scenario setup commands and try again',
    )
  }
}

export class ScenarioFetchError extends VibeError {
  constructor(url: string, reason?: string) {
    super(
      `Failed to fetch scenario from URL: ${url}${reason ? ` — ${reason}` : ''}`,
      'SCENARIO_FETCH_FAILED',
      'Check the URL is accessible and returns valid YAML',
    )
  }
}
