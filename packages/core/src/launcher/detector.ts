import { ClaudeCodeLauncher } from './claude-code.js'
import type { AIToolLauncher } from './types.js'

/** All supported AI tool launchers */
const launchers: AIToolLauncher[] = [new ClaudeCodeLauncher()]

/** Information about a detected AI coding tool */
export interface DetectedTool {
  /** The launcher instance */
  launcher: AIToolLauncher
  /** Installed version string, or null if unknown */
  version: string | null
}

/** Detect which AI coding tools are installed on the system */
export async function detectInstalledTools(): Promise<DetectedTool[]> {
  const results: DetectedTool[] = []

  for (const launcher of launchers) {
    const installed = await launcher.isInstalled()
    if (installed) {
      const version = await launcher.getVersion()
      results.push({ launcher, version })
    }
  }

  return results
}

/** Get a launcher by its internal name */
export function getLauncher(name: string): AIToolLauncher | undefined {
  return launchers.find((l) => l.name === name)
}

/** Get all registered launchers */
export function getAllLaunchers(): AIToolLauncher[] {
  return [...launchers]
}
