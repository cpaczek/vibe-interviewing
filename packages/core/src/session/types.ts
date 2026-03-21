import type { Session } from '../runtime/types.js'

export type { Session }

/** Serializable session data for persistence */
export interface StoredSession {
  id: string
  scenarioName: string
  scenarioPath: string
  status: Session['status']
  workdir: string
  containerId?: string
  ports: Record<number, number>
  aiTool?: string
  createdAt: string
  startedAt?: string
}

/** Convert a Session to a StoredSession */
export function toStoredSession(session: Session): StoredSession {
  return {
    id: session.id,
    scenarioName: session.scenarioName,
    scenarioPath: session.scenarioPath,
    status: session.status,
    workdir: session.workdir,
    containerId: session.containerId,
    ports: session.ports,
    aiTool: session.aiTool,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
  }
}
