// Scenario
export {
  ScenarioConfigSchema,
  type ScenarioConfig,
  type ScenarioType,
  type ScenarioInfo,
  type AIRules,
  type Evaluation,
} from './scenario/types.js'
export { loadScenarioConfig, generateSystemPrompt } from './scenario/loader.js'
export {
  validateScenario,
  validateScenarioOrThrow,
  type ValidationResult,
} from './scenario/validator.js'
export { discoverAllScenarios, discoverBuiltInScenarios } from './scenario/registry.js'
export { importRepo } from './scenario/importer.js'

// Launcher
export type { AIToolLauncher, LaunchConfig, LaunchedProcess } from './launcher/types.js'
export { ClaudeCodeLauncher } from './launcher/claude-code.js'
export {
  detectInstalledTools,
  getLauncher,
  getAllLaunchers,
  type DetectedTool,
} from './launcher/detector.js'

// Session
export { SessionManager, type Session, type ProgressCallback } from './session/manager.js'
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
export {
  encodeSessionCode,
  decodeSessionCode,
  InvalidSessionCodeError,
} from './network/session-code.js'

// Errors
export {
  VibeError,
  ScenarioNotFoundError,
  ScenarioValidationError,
  AIToolNotFoundError,
  SessionNotFoundError,
  GitCloneError,
  SetupError,
} from './errors.js'
