import { describe, it, expect } from 'vitest'
import {
  VibeError,
  ScenarioNotFoundError,
  ScenarioValidationError,
  AIToolNotFoundError,
  SessionNotFoundError,
  GitCloneError,
  SetupError,
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

describe('GitCloneError', () => {
  it('has correct code', () => {
    const err = new GitCloneError('https://github.com/test/repo')
    expect(err.code).toBe('GIT_CLONE_FAILED')
  })

  it('includes repo in message', () => {
    const err = new GitCloneError('https://github.com/test/repo')
    expect(err.message).toContain('https://github.com/test/repo')
  })

  it('includes reason when provided', () => {
    const err = new GitCloneError('https://github.com/test/repo', 'auth failed')
    expect(err.message).toContain('auth failed')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new GitCloneError('https://github.com/test/repo')
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('SetupError', () => {
  it('has correct code', () => {
    const err = new SetupError('npm install')
    expect(err.code).toBe('SETUP_FAILED')
  })

  it('includes command in message', () => {
    const err = new SetupError('npm install')
    expect(err.message).toContain('npm install')
  })

  it('includes reason when provided', () => {
    const err = new SetupError('npm install', 'ENOENT')
    expect(err.message).toContain('ENOENT')
  })

  it('is an instance of both VibeError and Error', () => {
    const err = new SetupError('npm install')
    expect(err).toBeInstanceOf(VibeError)
    expect(err).toBeInstanceOf(Error)
  })
})
