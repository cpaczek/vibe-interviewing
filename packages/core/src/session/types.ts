/** Status of an interview session */
export type SessionStatus = 'cloning' | 'setting-up' | 'running' | 'complete'

/** Interview session — used both in-memory and for persistence */
export interface Session {
  /** Unique session identifier */
  id: string
  /** Name of the scenario being run */
  scenarioName: string
  /** Local working directory for the candidate */
  workdir: string
  /** Path to the system prompt file (outside workspace) */
  systemPromptPath: string
  /** Current session status */
  status: SessionStatus
  /** ISO timestamp of session creation */
  createdAt: string
  /** ISO timestamp of when the AI tool was launched */
  startedAt?: string
  /** ISO timestamp of session completion */
  completedAt?: string
  /** Name of the AI tool used */
  aiTool?: string
}

/**
 * Serializable session data for persistence.
 * Identical to Session — kept as an alias for API clarity at persistence boundaries.
 */
export type StoredSession = Session

/** Convert a Session to a StoredSession for persistence */
export function toStoredSession(session: Session): StoredSession {
  return { ...session }
}
