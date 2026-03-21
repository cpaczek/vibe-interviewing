import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  loadScenarioConfig,
  generateSystemPrompt,
  loadSolution,
  loadEvaluation,
  resolveVibeDir,
} from './loader.js'
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
type: debug
difficulty: medium
estimated_time: "30m"
briefing: "Fix the broken API endpoint"
environment:
  image: node:20-slim
  commands:
    - npm
    - node
ai_context:
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

  describe('resolveVibeDir', () => {
    it('returns .vibe directory when it exists', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const result = resolveVibeDir(dir)

      expect(result).toBe(join(dir, '.vibe'))
    })

    it('returns scenarioPath when scenario.yaml exists at root', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'scenario.yaml'), validScenarioYaml)

      const result = resolveVibeDir(dir)

      expect(result).toBe(dir)
    })

    it('throws ScenarioNotFoundError when neither .vibe nor scenario.yaml exist', async () => {
      const dir = await createTempDir()

      expect(() => resolveVibeDir(dir)).toThrow(ScenarioNotFoundError)
    })
  })

  describe('loadScenarioConfig', () => {
    it('loads a valid scenario.yaml from .vibe directory', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'scenario.yaml'), validScenarioYaml)

      const config = await loadScenarioConfig(dir)

      expect(config.name).toBe('Test Scenario')
      expect(config.type).toBe('debug')
      expect(config.difficulty).toBe('medium')
      expect(config.briefing).toBe('Fix the broken API endpoint')
      expect(config.ai_context.role).toContain('helpful debugging assistant')
      expect(config.ai_context.rules).toHaveLength(2)
      expect(config.environment.commands).toEqual(['npm', 'node'])
    })

    it('throws ScenarioNotFoundError for missing directory', async () => {
      const dir = join(tmpdir(), 'nonexistent-scenario-dir-' + Date.now())

      await expect(loadScenarioConfig(dir)).rejects.toThrow(ScenarioNotFoundError)
    })

    it('throws ScenarioValidationError for invalid YAML content', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      // Missing required fields: type, difficulty, estimated_time, briefing, ai_context
      await writeFile(join(dir, '.vibe', 'scenario.yaml'), 'name: Only Name\n')

      await expect(loadScenarioConfig(dir)).rejects.toThrow(ScenarioValidationError)
    })

    it('throws ScenarioNotFoundError when .vibe exists but scenario.yaml does not', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      await expect(loadScenarioConfig(dir)).rejects.toThrow(ScenarioNotFoundError)
    })
  })

  describe('generateSystemPrompt', () => {
    it('includes role, rules, and knowledge', () => {
      const config: ScenarioConfig = {
        name: 'Test',
        version: '1.0.0',
        type: 'debug',
        difficulty: 'medium',
        estimated_time: '30m',
        tags: [],
        briefing: 'Fix it',
        environment: {
          ports: [],
          volumes: [],
          env: {},
          services: {},
          commands: [],
          setup_commands: [],
        },
        ai_context: {
          role: 'You are a debugging assistant',
          rules: ['Do not give the answer', 'Be encouraging'],
          knowledge: 'The bug is in line 42',
        },
      }

      const prompt = generateSystemPrompt(config)

      expect(prompt).toContain('# Interview Scenario: Test')
      expect(prompt).toContain('## Your Role')
      expect(prompt).toContain('You are a debugging assistant')
      expect(prompt).toContain('## Rules')
      expect(prompt).toContain('- Do not give the answer')
      expect(prompt).toContain('- Be encouraging')
      expect(prompt).toContain('## Knowledge (DO NOT share directly with the candidate)')
      expect(prompt).toContain('The bug is in line 42')
    })
  })

  describe('loadSolution', () => {
    it('returns content when solution.md exists', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'solution.md'), '# Solution\nFix line 42')

      const solution = await loadSolution(dir)

      expect(solution).toBe('# Solution\nFix line 42')
    })

    it('returns null when solution.md does not exist', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const solution = await loadSolution(dir)

      expect(solution).toBeNull()
    })
  })

  describe('loadEvaluation', () => {
    it('returns content when evaluation.md exists', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'evaluation.md'), '# Evaluation\n- Criterion 1')

      const evaluation = await loadEvaluation(dir)

      expect(evaluation).toBe('# Evaluation\n- Criterion 1')
    })

    it('returns null when evaluation.md does not exist', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const evaluation = await loadEvaluation(dir)

      expect(evaluation).toBeNull()
    })
  })
})
