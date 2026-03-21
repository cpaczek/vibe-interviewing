// Scenario
export {
  ScenarioConfigSchema,
  type ScenarioConfig,
  type ScenarioInfo,
  type Environment,
  type AIContext,
  type Evaluation,
} from './scenario/types.js'
export {
  loadScenarioConfig,
  loadSystemPrompt,
  loadSolution,
  loadEvaluation,
  generateSystemPrompt,
  resolveVibeDir,
  getCodebasePath,
} from './scenario/loader.js'
export {
  validateScenario,
  validateScenarioOrThrow,
  type ValidationResult,
} from './scenario/validator.js'
export {
  discoverAllScenarios,
  discoverBuiltInScenarios,
  discoverLocalScenarios,
  discoverSingleScenario,
} from './scenario/registry.js'
export { detectProject, type DetectedProject } from './scenario/auto-detect.js'
export {
  generateScenario,
  type GenerateOptions,
  type GeneratedScenario,
} from './scenario/generator.js'
export { importRepo } from './scenario/importer.js'

// Runtime
export type { Runtime, Session, ExecResult } from './runtime/types.js'
export { DockerRuntime } from './runtime/docker.js'
export { generateWrapperScripts } from './runtime/wrappers.js'
export { createRuntime, type RuntimeType } from './runtime/factory.js'

// Launcher
export type { AIToolLauncher, LaunchConfig, LaunchedProcess } from './launcher/types.js'
export { ClaudeCodeLauncher } from './launcher/claude-code.js'
export { OpenCodeLauncher } from './launcher/open-code.js'
export {
  detectInstalledTools,
  getLauncher,
  getAllLaunchers,
  type DetectedTool,
} from './launcher/detector.js'

// Session
export { SessionManager } from './session/manager.js'
export {
  SessionRecorder,
  type SessionEvent,
  type SessionEventType,
  type RecordingData,
} from './session/recorder.js'
export {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  listActiveSessions,
} from './session/store.js'
export { toStoredSession, type StoredSession } from './session/types.js'

// Network
export { createTunnel, type TunnelInfo } from './network/tunnel.js'

// Errors
export {
  VibeError,
  DockerNotFoundError,
  DockerNotRunningError,
  ScenarioNotFoundError,
  ScenarioValidationError,
  AIToolNotFoundError,
  SessionNotFoundError,
  ApiKeyMissingError,
  HealthCheckFailedError,
} from './errors.js'
