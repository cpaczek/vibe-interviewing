import { describe, it, expect } from 'vitest'
import { validateScenario, validateScenarioOrThrow } from './validator.js'
import { ScenarioValidationError } from '../errors.js'
import type { ScenarioConfig } from './types.js'

describe('validator', () => {
  function makeConfig(overrides: Partial<ScenarioConfig> = {}): ScenarioConfig {
    return {
      name: 'Test Scenario',
      description: 'A test debugging scenario',
      difficulty: 'medium',
      estimated_time: '30m',
      tags: [],
      repo: 'https://github.com/test/repo',
      commit: 'abc1234',
      setup: [],
      patch: [],
      briefing: 'Fix the broken endpoint',
      solution: 'Fix the auth middleware bug',
      ai_rules: {
        role: 'You are a debugging assistant',
        rules: ['Do not reveal the answer'],
        knowledge: 'The bug is in the auth middleware',
      },
      evaluation: {
        criteria: ['Found the bug', 'Used AI effectively'],
      },
      ...overrides,
    }
  }

  describe('validateScenario', () => {
    it('passes validation for a valid scenario', () => {
      const config = makeConfig()
      const result = validateScenario(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when briefing is empty', () => {
      const config = makeConfig({ briefing: '  ' })
      const result = validateScenario(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Briefing cannot be empty')
    })

    it('fails when ai_rules.role is empty', () => {
      const config = makeConfig({
        ai_rules: {
          role: '  ',
          rules: ['rule1'],
          knowledge: 'knowledge',
        },
      })
      const result = validateScenario(config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('ai_rules.role'))).toBe(true)
    })

    it('fails when repo is empty', () => {
      const config = makeConfig({ repo: '  ' })
      const result = validateScenario(config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('repo'))).toBe(true)
    })

    it('fails when commit is not a valid SHA', () => {
      const config = makeConfig({ commit: 'main' })
      const result = validateScenario(config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('hex SHA'))).toBe(true)
    })

    it('accepts a valid short SHA', () => {
      const config = makeConfig({ commit: 'abc1234' })
      const result = validateScenario(config)

      expect(result.valid).toBe(true)
    })

    it('accepts a valid full SHA', () => {
      const config = makeConfig({ commit: '4e8b18bf972eff2890ed67bd11d8a08a2c6502d5' })
      const result = validateScenario(config)

      expect(result.valid).toBe(true)
    })

    it('warns when rules are empty', () => {
      const config = makeConfig({
        ai_rules: {
          role: 'A role',
          rules: [],
          knowledge: 'knowledge',
        },
      })
      const result = validateScenario(config)

      expect(result.warnings.some((w) => w.includes('rules'))).toBe(true)
    })

    it('warns when solution is empty', () => {
      const config = makeConfig({ solution: '  ' })
      const result = validateScenario(config)

      expect(result.warnings.some((w) => w.includes('solution'))).toBe(true)
    })

    it('warns when no evaluation criteria defined', () => {
      const config = makeConfig({ evaluation: undefined })
      const result = validateScenario(config)

      expect(result.warnings.some((w) => w.includes('evaluation'))).toBe(true)
    })
  })

  describe('validateScenarioOrThrow', () => {
    it('throws ScenarioValidationError on errors', () => {
      const config = makeConfig({ briefing: '  ' })

      expect(() => validateScenarioOrThrow(config)).toThrow(ScenarioValidationError)
    })

    it('returns result when valid', () => {
      const config = makeConfig()
      const result = validateScenarioOrThrow(config)

      expect(result.valid).toBe(true)
    })
  })
})
