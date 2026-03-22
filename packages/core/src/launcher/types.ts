/** Configuration for launching an AI coding tool */
export interface LaunchConfig {
  /** Scenario name for display */
  scenarioName: string
  /** Path to system prompt file (hidden from candidate) */
  systemPromptPath: string
  /** Model to use */
  model?: string
  /** Permission mode for the AI tool */
  permissionMode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions'
  /** Tools to disallow (e.g., WebSearch for fairness) */
  disallowedTools?: string[]
  /** Whether to record stdout/stderr during the session */
  recording?: boolean
}

/** A running AI tool process */
export interface LaunchedProcess {
  /** Wait for the process to exit */
  wait(): Promise<{ exitCode: number }>
  /** Kill the process */
  kill(): Promise<void>
  /** Session recorder, present when recording is enabled */
  recorder?: import('../session/recorder.js').SessionRecorder
}

/** Interface for AI coding tool launchers */
export interface AIToolLauncher {
  /** Internal name identifier */
  readonly name: string
  /** Human-readable display name */
  readonly displayName: string

  /** Check if this tool is installed and accessible */
  isInstalled(): Promise<boolean>

  /** Get the installed version string */
  getVersion(): Promise<string | null>

  /** Launch the tool pointed at a working directory */
  launch(workdir: string, config: LaunchConfig): Promise<LaunchedProcess>
}
