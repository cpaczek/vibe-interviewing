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

export class DockerNotFoundError extends VibeError {
  constructor() {
    super(
      'Docker is not installed',
      'DOCKER_NOT_FOUND',
      'Install Docker Desktop: https://docs.docker.com/get-docker/',
    )
  }
}

export class DockerNotRunningError extends VibeError {
  constructor() {
    super(
      'Docker is installed but not running',
      'DOCKER_NOT_RUNNING',
      'Start Docker Desktop and try again',
    )
  }
}

export class ScenarioNotFoundError extends VibeError {
  constructor(path: string) {
    super(
      `Scenario not found at: ${path}`,
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
    'open-code': 'Install Open Code: see https://opencode.ai',
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
      'Run `vibe-interviewing list --active` to see active sessions',
    )
  }
}

export class HealthCheckFailedError extends VibeError {
  constructor(command: string, retries: number) {
    super(
      `Health check failed after ${retries} retries: ${command}`,
      'HEALTH_CHECK_FAILED',
      'Check the scenario Dockerfile and setup_commands for errors',
    )
  }
}
