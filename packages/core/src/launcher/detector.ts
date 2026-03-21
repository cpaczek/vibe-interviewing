import { ClaudeCodeLauncher } from './claude-code.js'
import { OpenCodeLauncher } from './open-code.js'
import type { AIToolLauncher } from './types.js'

/** All supported AI tool launchers */
const launchers: AIToolLauncher[] = [new ClaudeCodeLauncher(), new OpenCodeLauncher()]

export interface DetectedTool {
  launcher: AIToolLauncher
  version: string | null
}

/** Detect which AI coding tools are installed */
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

/** Get a launcher by name */
export function getLauncher(name: string): AIToolLauncher | undefined {
  return launchers.find((l) => l.name === name)
}

/** Get all registered launchers */
export function getAllLaunchers(): AIToolLauncher[] {
  return [...launchers]
}
