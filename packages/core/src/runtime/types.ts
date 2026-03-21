import type { ScenarioConfig } from '../scenario/types.js'

/** Represents an active interview session environment */
export interface Session {
  id: string
  scenarioName: string
  scenarioPath: string
  status: 'creating' | 'running' | 'stopping' | 'destroyed'
  /** Host-side workspace directory (what the candidate sees) */
  workdir: string
  /** Docker container ID for the main app */
  containerId?: string
  /** Mapped ports (host port -> container port) */
  ports: Record<number, number>
  /** Which AI tool was launched */
  aiTool?: string
  /** When the session was created */
  createdAt: string
  /** When the AI tool was launched (for elapsed time tracking) */
  startedAt?: string
}

/** Result of executing a command in the runtime */
export interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Runtime interface — abstraction over Docker, cloud, etc. */
export interface Runtime {
  readonly name: string

  /** Check if the runtime is available */
  isAvailable(): Promise<{ available: boolean; reason?: string }>

  /** Create a new environment from a scenario */
  create(scenario: ScenarioConfig, scenarioPath: string): Promise<Session>

  /** Start the environment */
  start(session: Session): Promise<void>

  /** Execute a command inside the environment */
  exec(session: Session, command: string): Promise<ExecResult>

  /** Get the host-side working directory */
  getWorkdir(session: Session): string

  /** Stop and remove the environment */
  destroy(session: Session): Promise<void>
}
