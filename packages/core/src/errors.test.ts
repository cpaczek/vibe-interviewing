import { describe, it, expect } from 'vitest'
import {
  VibeError,
  DockerNotFoundError,
  DockerNotRunningError,
  ScenarioNotFoundError,
  ScenarioValidationError,
  AIToolNotFoundError,
  SessionNotFoundError,
  HealthCheckFailedError,
} from './errors.js'

describe('VibeError', () => {
  it('stores code and hint', () => {
    const err = new VibeError('msg', 'CODE', 'a hint')
    expect(err.message).toBe('msg')
    expect(err.code).toBe('CODE')
    expect(err.hint).toBe('a hint')
  })

  it('is an instance of Error', () => {
    const err = new VibeError('msg', 'CODE')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('DockerNotFoundError', () => {
  it('has correct code', () => {
    const err = new DockerNotFoundError()
    expect(err.code).toBe('DOCKER_NOT_FOUND')
  })

  it('has a hint with install link', () => {
    const err = new DockerNotFoundError()
    expect(err.hint).toContain('https://docs.docker.com/get-docker/')
  })

  it('has a descriptive message', () => {
    const err = new DockerNotFoundError()
    expect(err.message).toContain('Docker')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new DockerNotFoundError()
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('DockerNotRunningError', () => {
  it('has correct code', () => {
    const err = new DockerNotRunningError()
    expect(err.code).toBe('DOCKER_NOT_RUNNING')
  })

  it('has a hint', () => {
    const err = new DockerNotRunningError()
    expect(err.hint).toContain('Start Docker Desktop')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new DockerNotRunningError()
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ScenarioNotFoundError', () => {
  it('has correct code', () => {
    const err = new ScenarioNotFoundError('/some/path')
    expect(err.code).toBe('SCENARIO_NOT_FOUND')
  })

  it('includes the path in the message', () => {
    const err = new ScenarioNotFoundError('/some/path')
    expect(err.message).toContain('/some/path')
  })

  it('has a helpful hint', () => {
    const err = new ScenarioNotFoundError('/some/path')
    expect(err.hint).toContain('vibe-interviewing list')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new ScenarioNotFoundError('/some/path')
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ScenarioValidationError', () => {
  it('has correct code', () => {
    const err = new ScenarioValidationError('bad config', ['issue1', 'issue2'])
    expect(err.code).toBe('SCENARIO_VALIDATION_ERROR')
  })

  it('includes the message in the error', () => {
    const err = new ScenarioValidationError('bad config', ['issue1'])
    expect(err.message).toContain('bad config')
  })

  it('joins issues into the hint', () => {
    const err = new ScenarioValidationError('bad config', ['issue1', 'issue2'])
    expect(err.hint).toBe('issue1\nissue2')
  })

  it('stores issues array', () => {
    const issues = ['missing field', 'invalid type']
    const err = new ScenarioValidationError('bad config', issues)
    expect(err.issues).toEqual(issues)
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new ScenarioValidationError('bad config', [])
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('AIToolNotFoundError', () => {
  it('has correct code', () => {
    const err = new AIToolNotFoundError('claude-code')
    expect(err.code).toBe('AI_TOOL_NOT_FOUND')
  })

  it('includes tool name in message', () => {
    const err = new AIToolNotFoundError('claude-code')
    expect(err.message).toContain('claude-code')
  })

  it('provides known install hint for claude-code', () => {
    const err = new AIToolNotFoundError('claude-code')
    expect(err.hint).toContain('npm install -g @anthropic-ai/claude-code')
  })

  it('provides known install hint for open-code', () => {
    const err = new AIToolNotFoundError('open-code')
    expect(err.hint).toContain('https://opencode.ai')
  })

  it('provides fallback hint for unknown tool', () => {
    const err = new AIToolNotFoundError('some-tool')
    expect(err.hint).toContain('Install some-tool')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new AIToolNotFoundError('claude-code')
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('SessionNotFoundError', () => {
  it('has correct code', () => {
    const err = new SessionNotFoundError('abc-123')
    expect(err.code).toBe('SESSION_NOT_FOUND')
  })

  it('includes the session id in message', () => {
    const err = new SessionNotFoundError('abc-123')
    expect(err.message).toContain('abc-123')
  })

  it('has a helpful hint', () => {
    const err = new SessionNotFoundError('abc-123')
    expect(err.hint).toContain('vibe-interviewing list')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new SessionNotFoundError('abc-123')
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('HealthCheckFailedError', () => {
  it('has correct code', () => {
    const err = new HealthCheckFailedError('curl localhost', 5)
    expect(err.code).toBe('HEALTH_CHECK_FAILED')
  })

  it('includes command and retries in message', () => {
    const err = new HealthCheckFailedError('curl localhost', 5)
    expect(err.message).toContain('curl localhost')
    expect(err.message).toContain('5')
  })

  it('has a helpful hint', () => {
    const err = new HealthCheckFailedError('curl localhost', 5)
    expect(err.hint).toContain('Dockerfile')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new HealthCheckFailedError('curl localhost', 5)
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})
