import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { generateWrapperScripts } from './wrappers.js'

describe('generateWrapperScripts', () => {
  const tempDirs: string[] = []

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'vibe-wrappers-'))
    tempDirs.push(dir)
    return dir
  }

  afterEach(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true })
    }
    tempDirs.length = 0
  })

  it('creates .vibe/bin/ directory', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm'], 'test-session')

    expect(existsSync(join(dir, '.vibe', 'bin'))).toBe(true)
  })

  it('creates a wrapper script for each command', async () => {
    const dir = await createTempDir()
    const commands = ['npm', 'node', 'npx']

    await generateWrapperScripts(dir, commands, 'test-session')

    for (const cmd of commands) {
      expect(existsSync(join(dir, '.vibe', 'bin', cmd))).toBe(true)
    }
  })

  it('wrapper scripts contain the correct docker exec command', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm'], 'my-session')

    const content = await readFile(join(dir, '.vibe', 'bin', 'npm'), 'utf-8')

    expect(content).toContain('docker exec')
    expect(content).toContain('vibe-my-session')
    expect(content).toContain('npm')
    expect(content).toContain('"$@"')
  })

  it('creates vibe-exec catch-all script', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm'], 'test-session')

    const vibeExecPath = join(dir, '.vibe', 'bin', 'vibe-exec')
    expect(existsSync(vibeExecPath)).toBe(true)

    const content = await readFile(vibeExecPath, 'utf-8')
    expect(content).toContain('docker exec')
    expect(content).toContain('vibe-test-session')
    expect(content).toContain('Usage: vibe-exec')
  })

  it('scripts are executable (mode 0o755)', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm', 'node'], 'test-session')

    for (const file of ['npm', 'node', 'vibe-exec']) {
      const fileStat = await stat(join(dir, '.vibe', 'bin', file))
      // Check that execute bits are set
      expect(fileStat.mode & 0o111).toBeGreaterThan(0)
    }
  })

  it('creates env.sh with PATH prepend', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm'], 'test-session')

    const envPath = join(dir, '.vibe', 'env.sh')
    expect(existsSync(envPath)).toBe(true)

    const content = await readFile(envPath, 'utf-8')
    expect(content).toContain('export PATH=')
    expect(content).toContain('.vibe/bin')
    expect(content).toContain('VIBE_CONTAINER')
    expect(content).toContain('vibe-test-session')
  })

  it('wrapper script starts with shebang', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, ['npm'], 'test-session')

    const content = await readFile(join(dir, '.vibe', 'bin', 'npm'), 'utf-8')
    expect(content.startsWith('#!/bin/bash')).toBe(true)
  })

  it('handles empty commands array (only creates vibe-exec)', async () => {
    const dir = await createTempDir()

    await generateWrapperScripts(dir, [], 'test-session')

    expect(existsSync(join(dir, '.vibe', 'bin', 'vibe-exec'))).toBe(true)
    expect(existsSync(join(dir, '.vibe', 'env.sh'))).toBe(true)
  })
})
