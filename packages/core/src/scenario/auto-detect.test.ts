import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectProject } from './auto-detect.js'

describe('detectProject', () => {
  const tempDirs: string[] = []

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'vibe-detect-'))
    tempDirs.push(dir)
    return dir
  }

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true })
    }
    tempDirs.length = 0
  })

  describe('Node.js detection', () => {
    it('detects Node.js from package.json with npm', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test' }))

      const result = await detectProject(dir)

      expect(result.language).toBe('node')
      expect(result.packageManager).toBe('npm')
      expect(result.commands).toContain('npm')
      expect(result.commands).toContain('node')
      expect(result.commands).toContain('npx')
    })

    it('detects pnpm packageManager', async () => {
      const dir = await createTempDir()
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'test', packageManager: 'pnpm@9.0.0' }),
      )

      const result = await detectProject(dir)

      expect(result.packageManager).toBe('pnpm')
      expect(result.commands).toContain('pnpm')
    })

    it('detects yarn packageManager', async () => {
      const dir = await createTempDir()
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'test', packageManager: 'yarn@4.0.0' }),
      )

      const result = await detectProject(dir)

      expect(result.packageManager).toBe('yarn')
      expect(result.commands).toContain('yarn')
    })

    it('detects port from start script', async () => {
      const dir = await createTempDir()
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { start: 'PORT=4000 node server.js' } }),
      )

      const result = await detectProject(dir)

      expect(result.ports).toContain('4000:4000')
    })

    it('defaults to port 3000 when no port in scripts', async () => {
      const dir = await createTempDir()
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { start: 'node server.js' } }),
      )

      const result = await detectProject(dir)

      expect(result.ports).toContain('3000:3000')
    })

    it('generates suggestedDockerfile for npm', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test' }))

      const result = await detectProject(dir)

      expect(result.suggestedDockerfile).toBeDefined()
      expect(result.suggestedDockerfile).toContain('node:20-slim')
      expect(result.suggestedDockerfile).toContain('npm install')
    })

    it('generates suggestedDockerfile with pnpm install for pnpm projects', async () => {
      const dir = await createTempDir()
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'test', packageManager: 'pnpm@9.0.0' }),
      )

      const result = await detectProject(dir)

      expect(result.suggestedDockerfile).toContain('corepack enable')
      expect(result.suggestedDockerfile).toContain('pnpm install')
    })

    it('does not generate suggestedDockerfile if Dockerfile exists', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'test' }))
      await writeFile(join(dir, 'Dockerfile'), 'FROM node:20')

      const result = await detectProject(dir)

      expect(result.suggestedDockerfile).toBeUndefined()
      expect(result.hasDockerfile).toBe(true)
    })
  })

  describe('Python detection', () => {
    it('detects Python from requirements.txt', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'requirements.txt'), 'flask==3.0.0')

      const result = await detectProject(dir)

      expect(result.language).toBe('python')
      expect(result.commands).toContain('python')
      expect(result.commands).toContain('pip')
      expect(result.commands).toContain('pytest')
    })

    it('detects Python from pyproject.toml', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'pyproject.toml'), '[project]\nname = "test"')

      const result = await detectProject(dir)

      expect(result.language).toBe('python')
      expect(result.packageManager).toBe('poetry/pip')
    })

    it('suggests port 8000 for Python projects', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'requirements.txt'), 'fastapi')

      const result = await detectProject(dir)

      expect(result.ports).toContain('8000:8000')
    })

    it('generates suggestedDockerfile for Python', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'requirements.txt'), 'flask')

      const result = await detectProject(dir)

      expect(result.suggestedDockerfile).toContain('python:3.12-slim')
      expect(result.suggestedDockerfile).toContain('pip install')
    })
  })

  describe('Go detection', () => {
    it('detects Go from go.mod', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'go.mod'), 'module example.com/test\ngo 1.22')

      const result = await detectProject(dir)

      expect(result.language).toBe('go')
      expect(result.commands).toContain('go')
      expect(result.ports).toContain('8080:8080')
    })

    it('generates suggestedDockerfile for Go', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'go.mod'), 'module example.com/test\ngo 1.22')

      const result = await detectProject(dir)

      expect(result.suggestedDockerfile).toContain('golang:1.22-alpine')
      expect(result.suggestedDockerfile).toContain('go build')
    })
  })

  describe('Rust detection', () => {
    it('detects Rust from Cargo.toml', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'Cargo.toml'), '[package]\nname = "test"')

      const result = await detectProject(dir)

      expect(result.language).toBe('rust')
      expect(result.commands).toContain('cargo')
      expect(result.ports).toContain('8080:8080')
    })
  })

  describe('Docker detection', () => {
    it('detects existing Dockerfile', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'Dockerfile'), 'FROM alpine')

      const result = await detectProject(dir)

      expect(result.hasDockerfile).toBe(true)
    })

    it('detects lowercase dockerfile', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'dockerfile'), 'FROM alpine')

      const result = await detectProject(dir)

      expect(result.hasDockerfile).toBe(true)
    })

    it('detects docker-compose.yml', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'docker-compose.yml'), 'version: "3"')

      const result = await detectProject(dir)

      expect(result.hasDockerCompose).toBe(true)
    })

    it('detects docker-compose.yaml', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'docker-compose.yaml'), 'version: "3"')

      const result = await detectProject(dir)

      expect(result.hasDockerCompose).toBe(true)
    })

    it('detects compose.yml', async () => {
      const dir = await createTempDir()
      await writeFile(join(dir, 'compose.yml'), 'version: "3"')

      const result = await detectProject(dir)

      expect(result.hasDockerCompose).toBe(true)
    })
  })

  describe('unknown project', () => {
    it('returns unknown language for empty directory', async () => {
      const dir = await createTempDir()

      const result = await detectProject(dir)

      expect(result.language).toBe('unknown')
      expect(result.hasDockerfile).toBe(false)
      expect(result.hasDockerCompose).toBe(false)
      expect(result.ports).toEqual([])
    })

    it('always includes curl in commands', async () => {
      const dir = await createTempDir()

      const result = await detectProject(dir)

      expect(result.commands).toContain('curl')
    })
  })
})
