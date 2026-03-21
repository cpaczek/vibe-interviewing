import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

/** Event types that can be captured during a session */
export type SessionEventType = 'stdout' | 'stderr' | 'command' | 'note'

/** A single timestamped event captured during a session */
export interface SessionEvent {
  /** Milliseconds since recording started */
  timestamp: number
  /** The kind of event */
  type: SessionEventType
  /** The captured data */
  data: string
}

/** Serialized recording format */
export interface RecordingData {
  /** Session ID this recording belongs to */
  sessionId: string
  /** ISO string of when recording started */
  startedAt: string
  /** All captured events */
  events: SessionEvent[]
}

const RECORDINGS_DIR = join(homedir(), '.vibe-interviewing', 'recordings')

async function ensureRecordingsDir(): Promise<void> {
  if (!existsSync(RECORDINGS_DIR)) {
    await mkdir(RECORDINGS_DIR, { recursive: true })
  }
}

/**
 * Records timestamped events during an interview session.
 *
 * Captures stdout, stderr, commands, and notes with millisecond timestamps
 * relative to when the recorder was created.
 */
export class SessionRecorder {
  private readonly events: SessionEvent[] = []
  private readonly startTime: number
  private readonly startedAt: string

  constructor() {
    this.startTime = Date.now()
    this.startedAt = new Date().toISOString()
  }

  /** Record a timestamped event */
  record(type: SessionEventType, data: string): void {
    this.events.push({
      timestamp: Date.now() - this.startTime,
      type,
      data,
    })
  }

  /** Get all recorded events */
  getEvents(): ReadonlyArray<SessionEvent> {
    return this.events
  }

  /** Serialize the recording to a JSON-compatible object */
  toJSON(sessionId: string): RecordingData {
    return {
      sessionId,
      startedAt: this.startedAt,
      events: [...this.events],
    }
  }

  /** Create a SessionRecorder pre-populated with events from serialized data */
  static fromJSON(data: RecordingData): SessionRecorder {
    const recorder = new SessionRecorder()
    // Override the startedAt via Object.defineProperty since it's readonly
    Object.defineProperty(recorder, 'startedAt', { value: data.startedAt })
    for (const event of data.events) {
      recorder.events.push({ ...event })
    }
    return recorder
  }

  /** Save the recording to disk */
  async save(sessionId: string): Promise<void> {
    await ensureRecordingsDir()
    const filePath = join(RECORDINGS_DIR, `${sessionId}.json`)
    const data = this.toJSON(sessionId)
    await writeFile(filePath, JSON.stringify(data, null, 2))
  }

  /** Load a recording from disk */
  static async load(sessionId: string): Promise<SessionRecorder> {
    const filePath = join(RECORDINGS_DIR, `${sessionId}.json`)
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as RecordingData
    return SessionRecorder.fromJSON(data)
  }

  /** List all available recording session IDs */
  static async list(): Promise<string[]> {
    await ensureRecordingsDir()
    const files = await readdir(RECORDINGS_DIR)
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
  }
}
