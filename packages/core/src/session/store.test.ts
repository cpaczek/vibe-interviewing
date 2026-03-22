import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StoredSession } from './types.js'

/**
 * The store module uses a hardcoded SESSIONS_DIR constant.
 * We mock the homedir() to redirect it to a temp directory,
 * then dynamically import the store module so the constant picks up the mock.
 */
describe('session store', () => {
  let tempDir: string
  let store: typeof import('./store.js')

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'vibe-store-'))

    // Mock homedir to redirect SESSIONS_DIR
    vi.doMock('node:os', () => ({
      homedir: () => tempDir,
    }))

    // Dynamically import so the module picks up the mocked homedir
    store = await import('./store.js')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.resetModules()
    await rm(tempDir, { recursive: true, force: true })
  })

  function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
    return {
      id: 'test-session-1',
      scenarioName: 'Test Scenario',
      status: 'running',
      workdir: '/tmp/workdir',
      systemPromptPath: '/tmp/prompts/test.md',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }
  }

  describe('saveSession + loadSession roundtrip', () => {
    it('saves and loads a session', async () => {
      const session = makeSession()

      await store.saveSession(session)
      const loaded = await store.loadSession('test-session-1')

      expect(loaded).toEqual(session)
    })

    it('preserves all fields', async () => {
      const session = makeSession({
        id: 'full-session',
        aiTool: 'claude-code',
        startedAt: '2026-01-01T00:05:00.000Z',
        completedAt: '2026-01-01T01:00:00.000Z',
      })

      await store.saveSession(session)
      const loaded = await store.loadSession('full-session')

      expect(loaded).toEqual(session)
      expect(loaded?.aiTool).toBe('claude-code')
      expect(loaded?.startedAt).toBe('2026-01-01T00:05:00.000Z')
      expect(loaded?.completedAt).toBe('2026-01-01T01:00:00.000Z')
    })
  })

  describe('loadSession', () => {
    it('returns null for non-existent session', async () => {
      // Ensure sessions dir exists first
      await store.saveSession(makeSession())
      const loaded = await store.loadSession('nonexistent-id')

      expect(loaded).toBeNull()
    })
  })

  describe('listSessions', () => {
    it('returns sessions sorted by createdAt (newest first)', async () => {
      const s1 = makeSession({ id: 'session-1', createdAt: '2026-01-01T00:00:00.000Z' })
      const s2 = makeSession({ id: 'session-2', createdAt: '2026-01-03T00:00:00.000Z' })
      const s3 = makeSession({ id: 'session-3', createdAt: '2026-01-02T00:00:00.000Z' })

      await store.saveSession(s1)
      await store.saveSession(s2)
      await store.saveSession(s3)

      const sessions = await store.listSessions()

      expect(sessions).toHaveLength(3)
      expect(sessions[0]?.id).toBe('session-2')
      expect(sessions[1]?.id).toBe('session-3')
      expect(sessions[2]?.id).toBe('session-1')
    })

    it('returns empty array when no sessions exist', async () => {
      const sessions = await store.listSessions()

      expect(sessions).toEqual([])
    })
  })

  describe('listActiveSessions', () => {
    it('filters out complete sessions', async () => {
      const active1 = makeSession({ id: 'active-1', status: 'running' })
      const active2 = makeSession({ id: 'active-2', status: 'cloning' })
      const complete = makeSession({ id: 'complete-1', status: 'complete' })

      await store.saveSession(active1)
      await store.saveSession(active2)
      await store.saveSession(complete)

      const sessions = await store.listActiveSessions()

      expect(sessions).toHaveLength(2)
      expect(sessions.every((s) => s.status !== 'complete')).toBe(true)
    })
  })

  describe('deleteSession', () => {
    it('removes the session file', async () => {
      const session = makeSession({ id: 'to-delete' })
      await store.saveSession(session)

      // Verify it exists
      const before = await store.loadSession('to-delete')
      expect(before).not.toBeNull()

      await store.deleteSession('to-delete')

      const after = await store.loadSession('to-delete')
      expect(after).toBeNull()
    })

    it('does not throw when deleting non-existent session', async () => {
      await expect(store.deleteSession('nonexistent')).resolves.not.toThrow()
    })
  })
})
