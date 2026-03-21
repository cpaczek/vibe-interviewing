import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import type { StoredSession } from './types.js'

const SESSIONS_DIR = join(homedir(), '.vibe-interviewing', 'sessions')

async function ensureSessionsDir(): Promise<void> {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true })
  }
}

/** Save a session to disk */
export async function saveSession(session: StoredSession): Promise<void> {
  await ensureSessionsDir()
  const filePath = join(SESSIONS_DIR, `${session.id}.json`)
  await writeFile(filePath, JSON.stringify(session, null, 2))
}

/** Load a session from disk */
export async function loadSession(id: string): Promise<StoredSession | null> {
  const filePath = join(SESSIONS_DIR, `${id}.json`)
  if (!existsSync(filePath)) return null

  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as StoredSession
}

/** Delete a session from disk */
export async function deleteSession(id: string): Promise<void> {
  const filePath = join(SESSIONS_DIR, `${id}.json`)
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}

/** List all stored sessions */
export async function listSessions(): Promise<StoredSession[]> {
  await ensureSessionsDir()
  const files = await readdir(SESSIONS_DIR)
  const sessions: StoredSession[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await readFile(join(SESSIONS_DIR, file), 'utf-8')
      sessions.push(JSON.parse(raw) as StoredSession)
    } catch {
      // Skip corrupted files
    }
  }

  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** List only active (non-destroyed) sessions */
export async function listActiveSessions(): Promise<StoredSession[]> {
  const all = await listSessions()
  return all.filter((s) => s.status !== 'destroyed')
}
