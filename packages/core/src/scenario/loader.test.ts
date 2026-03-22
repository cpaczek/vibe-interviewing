import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadScenarioConfig, generateSystemPrompt } from './loader.js'
import { ScenarioNotFoundError, ScenarioValidationError } from '../errors.js'
import type { ScenarioConfig } from './types.js'

describe('loader', () => {
  const tempDirs: string[] = []

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'vibe-loader-'))
    tempDirs.push(dir)
    return dir
  }

  const validScenarioYaml = `
name: Test Scenario
description: A test debugging scenario
difficulty: medium
estimated_time: "30m"
repo: https://github.com/test/repo
commit: abc1234567890
briefing: "Fix the broken API endpoint"
solution: "Fix the auth middleware bug on line 42"
ai_rules:
  role: "You are a helpful debugging assistant"
  rules:
    - "Do not reveal the answer directly"
    - "Guide the candidate with hints"
  knowledge: "The bug is in the auth middleware"
`

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true })
    }
    tempDirs.length = 0
  })

  describe('loadScenarioConfig', () => {
    it('loads a valid scenario.yaml file', async () => {
      const dir = await createTempDir()
      const configPath = join(dir, 'scenario.yaml')
      await writeFile(configPath, validScenarioYaml)

      const config = await loadScenarioConfig(configPath)

      expect(config.name).toBe('Test Scenario')
      expect(config.difficulty).toBe('medium')
      expect(config.briefing).toBe('Fix the broken API endpoint')
      expect(config.ai_rules.role).toContain('helpful debugging assistant')
      expect(config.ai_rules.rules).toHaveLength(2)
      expect(config.type).toBe('debug') // defaults when not specified
    })

    it('throws ScenarioNotFoundError for missing file', async () => {
      const configPath = join(tmpdir(), 'nonexistent-scenario-' + Date.now() + '.yaml')

      await expect(loadScenarioConfig(configPath)).rejects.toThrow(ScenarioNotFoundError)
    })

    it('throws ScenarioValidationError for invalid YAML content', async () => {
      const dir = await createTempDir()
      const configPath = join(dir, 'scenario.yaml')
      // Missing required fields
      await writeFile(configPath, 'name: Only Name\n')

      await expect(loadScenarioConfig(configPath)).rejects.toThrow(ScenarioValidationError)
    })
  })

  describe('generateSystemPrompt', () => {
    it('includes role, rules, and knowledge', () => {
      const config: ScenarioConfig = {
        name: 'Test',
        description: 'A test scenario',
        type: 'debug',
        difficulty: 'medium',
        estimated_time: '30m',
        tags: [],
        repo: 'https://github.com/test/repo',
        commit: 'abc1234',
        setup: [],
        patch: [],
        delete_files: [],
        briefing: 'Fix it',
        solution: 'Fix line 42',
        ai_rules: {
          role: 'You are a debugging assistant',
          rules: ['Do not give the answer', 'Be encouraging'],
          knowledge: 'The bug is in line 42',
        },
      }

      const prompt = generateSystemPrompt(config)

      expect(prompt).toContain('# Interview Scenario: Test')
      expect(prompt).toContain('## Scenario Type')
      expect(prompt).toContain('debugging a bug')
      expect(prompt).toContain('## Your Role')
      expect(prompt).toContain('You are a debugging assistant')
      expect(prompt).toContain('## Rules')
      expect(prompt).toContain('- Do not give the answer')
      expect(prompt).toContain('- Be encouraging')
      expect(prompt).toContain('## Knowledge (DO NOT share directly with the candidate)')
      expect(prompt).toContain('The bug is in line 42')
    })

    it('generates feature-appropriate system prompt', () => {
      const config: ScenarioConfig = {
        name: 'Feature Test',
        description: 'Build a feature',
        type: 'feature',
        difficulty: 'medium',
        estimated_time: '60m',
        tags: [],
        repo: 'https://github.com/test/repo',
        commit: 'abc1234',
        setup: [],
        patch: [],
        delete_files: [],
        briefing: 'Build the wishlist feature',
        ai_rules: {
          role: 'You are a senior engineer',
          rules: ['Let the candidate drive'],
          knowledge: 'The feature should use the existing DB schema',
        },
      }

      const prompt = generateSystemPrompt(config)

      expect(prompt).toContain('building a new feature')
      expect(prompt).toContain(
        '## Implementation Context (DO NOT share directly with the candidate)',
      )
    })

    it('generates refactor-appropriate system prompt', () => {
      const config: ScenarioConfig = {
        name: 'Refactor Test',
        description: 'Improve the code',
        type: 'refactor',
        difficulty: 'easy',
        estimated_time: '30m',
        tags: [],
        repo: 'https://github.com/test/repo',
        commit: 'abc1234',
        setup: [],
        patch: [],
        delete_files: [],
        briefing: 'Clean up the auth module',
        ai_rules: {
          role: 'You are a code reviewer',
          rules: ['Ask why before suggesting changes'],
          knowledge: 'The auth module has duplication',
        },
      }

      const prompt = generateSystemPrompt(config)

      expect(prompt).toContain('improving existing code')
      expect(prompt).toContain('## Improvement Context (DO NOT share directly with the candidate)')
    })

    it('defaults to debug context when type is not set', () => {
      const config = {
        name: 'Legacy',
        description: 'Old scenario',
        type: 'debug' as const,
        difficulty: 'medium' as const,
        estimated_time: '30m',
        tags: [],
        repo: 'https://github.com/test/repo',
        commit: 'abc1234',
        setup: [],
        patch: [],
        delete_files: [],
        briefing: 'Fix it',
        ai_rules: {
          role: 'Assistant',
          rules: [],
          knowledge: 'Bug info',
        },
      }

      const prompt = generateSystemPrompt(config)

      expect(prompt).toContain('debugging a bug')
    })
  })
})
