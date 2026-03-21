import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateScenario, validateScenarioOrThrow } from './validator.js'
import { ScenarioValidationError } from '../errors.js'
import type { ScenarioConfig } from './types.js'

describe('validator', () => {
  const tempDirs: string[] = []

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'vibe-validator-'))
    tempDirs.push(dir)
    return dir
  }

  function makeConfig(overrides: Partial<ScenarioConfig> = {}): ScenarioConfig {
    return {
      name: 'Test Scenario',
      version: '1.0.0',
      type: 'debug',
      difficulty: 'medium',
      estimated_time: '30m',
      tags: [],
      briefing: 'Fix the broken endpoint',
      environment: {
        image: 'node:20-slim',
        ports: [],
        volumes: [],
        env: {},
        services: {},
        commands: ['npm', 'node'],
        setup_commands: [],
      },
      ai_context: {
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

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true })
    }
    tempDirs.length = 0
  })

  describe('validateScenario', () => {
    it('passes validation for a valid scenario with image', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'solution.md'), '# Solution')

      const config = makeConfig()
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('passes validation for a valid scenario with dockerfile', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'Dockerfile'), 'FROM node:20')
      await writeFile(join(dir, '.vibe', 'solution.md'), '# Solution')

      const config = makeConfig({
        environment: {
          dockerfile: 'Dockerfile',
          ports: [],
          volumes: [],
          env: {},
          services: {},
          commands: ['npm'],
          setup_commands: [],
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when briefing is empty', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({ briefing: '  ' })
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Briefing cannot be empty')
    })

    it('fails when ai_context.role is empty', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        ai_context: {
          role: '  ',
          rules: ['rule1'],
          knowledge: 'knowledge',
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('ai_context.role'))).toBe(true)
    })

    it('warns when rules are empty', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        ai_context: {
          role: 'A role',
          rules: [],
          knowledge: 'knowledge',
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.warnings.some((w) => w.includes('rules'))).toBe(true)
    })

    it('warns when knowledge is empty', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        ai_context: {
          role: 'A role',
          rules: ['rule1'],
          knowledge: '  ',
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.warnings.some((w) => w.includes('knowledge'))).toBe(true)
    })

    it('errors when neither dockerfile nor image is specified', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        environment: {
          ports: [],
          volumes: [],
          env: {},
          services: {},
          commands: ['npm'],
          setup_commands: [],
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('dockerfile') || e.includes('image'))).toBe(true)
    })

    it('errors when dockerfile is specified but file does not exist', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        environment: {
          dockerfile: 'nonexistent.Dockerfile',
          ports: [],
          volumes: [],
          env: {},
          services: {},
          commands: ['npm'],
          setup_commands: [],
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Dockerfile not found'))).toBe(true)
    })

    it('warns when no evaluation criteria defined', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({ evaluation: undefined })
      const result = await validateScenario(dir, config)

      expect(result.warnings.some((w) => w.includes('evaluation'))).toBe(true)
    })

    it('warns when no commands defined', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({
        environment: {
          image: 'node:20',
          ports: [],
          volumes: [],
          env: {},
          services: {},
          commands: [],
          setup_commands: [],
        },
      })
      const result = await validateScenario(dir, config)

      expect(result.warnings.some((w) => w.includes('commands'))).toBe(true)
    })

    it('warns when solution.md is missing', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig()
      const result = await validateScenario(dir, config)

      expect(result.warnings.some((w) => w.includes('solution.md'))).toBe(true)
    })
  })

  describe('validateScenarioOrThrow', () => {
    it('throws ScenarioValidationError on errors', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })

      const config = makeConfig({ briefing: '  ' })

      await expect(validateScenarioOrThrow(dir, config)).rejects.toThrow(ScenarioValidationError)
    })

    it('returns result when valid', async () => {
      const dir = await createTempDir()
      await mkdir(join(dir, '.vibe'), { recursive: true })
      await writeFile(join(dir, '.vibe', 'solution.md'), '# Solution')

      const config = makeConfig()
      const result = await validateScenarioOrThrow(dir, config)

      expect(result.valid).toBe(true)
    })
  })
})
