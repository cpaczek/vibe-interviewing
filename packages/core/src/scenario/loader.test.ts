import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadScenarioConfig, generateSystemPrompt, isUrl } from './loader.js'
import { ScenarioNotFoundError, ScenarioValidationError, ScenarioFetchError } from '../errors.js'
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

    it('parses a scenario with interviewer_guide', async () => {
      const dir = await createTempDir()
      const configPath = join(dir, 'scenario.yaml')
      const yamlWithGuide =
        validScenarioYaml +
        `
interviewer_guide:
  overview: "Tests debugging skills"
  key_signals:
    - signal: "Reproduces first"
      positive: "Uses curl to reproduce"
      negative: "Jumps to code"
  common_pitfalls:
    - "Skips reproduction"
  debrief_questions:
    - "Walk me through your process"
`
      await writeFile(configPath, yamlWithGuide)

      const config = await loadScenarioConfig(configPath)

      expect(config.interviewer_guide).toBeDefined()
      expect(config.interviewer_guide!.overview).toBe('Tests debugging skills')
      expect(config.interviewer_guide!.key_signals).toHaveLength(1)
      expect(config.interviewer_guide!.key_signals[0]!.signal).toBe('Reproduces first')
      expect(config.interviewer_guide!.key_signals[0]!.positive).toBe('Uses curl to reproduce')
      expect(config.interviewer_guide!.key_signals[0]!.negative).toBe('Jumps to code')
      expect(config.interviewer_guide!.common_pitfalls).toEqual(['Skips reproduction'])
      expect(config.interviewer_guide!.debrief_questions).toEqual(['Walk me through your process'])
    })

    it('parses a scenario without interviewer_guide (backward compat)', async () => {
      const dir = await createTempDir()
      const configPath = join(dir, 'scenario.yaml')
      await writeFile(configPath, validScenarioYaml)

      const config = await loadScenarioConfig(configPath)

      expect(config.interviewer_guide).toBeUndefined()
    })
  })

  describe('isUrl', () => {
    it('returns true for https URLs', () => {
      expect(isUrl('https://example.com/scenario.yaml')).toBe(true)
    })

    it('returns true for http URLs', () => {
      expect(isUrl('http://example.com/scenario.yaml')).toBe(true)
    })

    it('returns false for file paths', () => {
      expect(isUrl('/home/user/scenario.yaml')).toBe(false)
      expect(isUrl('./scenario.yaml')).toBe(false)
      expect(isUrl('scenario.yaml')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isUrl('')).toBe(false)
    })
  })

  describe('loadScenarioConfig with URLs', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('fetches and parses a scenario from a URL', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(validScenarioYaml, { status: 200 }),
      )

      const config = await loadScenarioConfig('https://example.com/scenario.yaml')

      expect(config.name).toBe('Test Scenario')
      expect(config.difficulty).toBe('medium')
      expect(globalThis.fetch).toHaveBeenCalledOnce()
    })

    it('converts GitHub blob URLs to raw URLs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(validScenarioYaml, { status: 200 }),
      )

      await loadScenarioConfig('https://github.com/owner/repo/blob/main/scenario.yaml')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/scenario.yaml',
        expect.objectContaining({}),
      )
    })

    it('throws ScenarioFetchError on non-2xx response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404, statusText: 'Not Found' }),
      )

      await expect(loadScenarioConfig('https://example.com/scenario.yaml')).rejects.toThrow(
        ScenarioFetchError,
      )
    })

    it('throws ScenarioFetchError on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

      await expect(loadScenarioConfig('https://example.com/scenario.yaml')).rejects.toThrow(
        ScenarioFetchError,
      )
    })

    it('throws ScenarioValidationError for invalid YAML from URL', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('name: Only Name\n', { status: 200 }),
      )

      await expect(loadScenarioConfig('https://example.com/scenario.yaml')).rejects.toThrow(
        ScenarioValidationError,
      )
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
