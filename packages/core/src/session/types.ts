/** Status of an interview session */
export type SessionStatus = 'cloning' | 'setting-up' | 'running' | 'complete'

/** A live interview session */
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

/** Serializable session data for persistence */
export interface StoredSession {
  /** Unique session identifier */
  id: string
  /** Name of the scenario being run */
  scenarioName: string
  /** Current session status */
  status: SessionStatus
  /** Local working directory for the candidate */
  workdir: string
  /** Path to the system prompt file */
  systemPromptPath: string
  /** Name of the AI tool used */
  aiTool?: string
  /** ISO timestamp of session creation */
  createdAt: string
  /** ISO timestamp of when the AI tool was launched */
  startedAt?: string
  /** ISO timestamp of session completion */
  completedAt?: string
}

/** Convert a Session to a StoredSession for persistence */
export function toStoredSession(session: Session): StoredSession {
  return {
    id: session.id,
    scenarioName: session.scenarioName,
    status: session.status,
    workdir: session.workdir,
    systemPromptPath: session.systemPromptPath,
    aiTool: session.aiTool,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  }
}
