import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadScenarioConfig } from './loader.js'
import type { ScenarioInfo } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Get the path to built-in scenarios */
function getBuiltInScenariosPath(): string {
  // When running from source: packages/core/src/scenario/ → ../../scenarios/
  // When running from dist:   packages/core/dist/ → ../scenarios/
  // When bundled into cli:    packages/cli/dist/ → ../scenarios/
  // We try multiple possible paths and use the first one that exists
  const candidates = [
    join(__dirname, '..', 'scenarios'), // from dist/ (core or cli)
    join(__dirname, '..', '..', 'scenarios'), // from dist/scenario/
    join(__dirname, '..', '..', '..', 'scenarios'), // from src/scenario/
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: try to find it relative to process.cwd() (monorepo root)
  const fromCwd = join(process.cwd(), 'packages', 'scenarios')
  if (existsSync(fromCwd)) {
    return fromCwd
  }

  // Last resort: return the most likely path
  return join(__dirname, '..', 'scenarios')
}

/** Discover all built-in scenarios */
export async function discoverBuiltInScenarios(): Promise<ScenarioInfo[]> {
  const scenariosPath = getBuiltInScenariosPath()
  if (!existsSync(scenariosPath)) {
    return []
  }

  const entries = await readdir(scenariosPath, { withFileTypes: true })
  const scenarios: ScenarioInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const scenarioDir = join(scenariosPath, entry.name)
    try {
      const config = await loadScenarioConfig(scenarioDir)
      scenarios.push({
        name: config.name,
        path: scenarioDir,
        config,
        builtIn: true,
      })
    } catch {
      // Skip directories that aren't valid scenarios
    }
  }

  return scenarios
}

/** Discover scenarios in a custom directory */
export async function discoverLocalScenarios(searchPath: string): Promise<ScenarioInfo[]> {
  if (!existsSync(searchPath)) {
    return []
  }

  const entries = await readdir(searchPath, { withFileTypes: true })
  const scenarios: ScenarioInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const scenarioDir = join(searchPath, entry.name)
    try {
      const config = await loadScenarioConfig(scenarioDir)
      scenarios.push({
        name: config.name,
        path: scenarioDir,
        config,
        builtIn: false,
      })
    } catch {
      // Skip invalid directories
    }
  }

  return scenarios
}

/** Discover a single scenario from a directory with .vibe/ */
export async function discoverSingleScenario(scenarioPath: string): Promise<ScenarioInfo | null> {
  try {
    const config = await loadScenarioConfig(scenarioPath)
    return {
      name: config.name,
      path: scenarioPath,
      config,
      builtIn: false,
    }
  } catch {
    return null
  }
}

/** Discover all available scenarios (built-in + current dir + custom paths) */
export async function discoverAllScenarios(localPaths: string[] = []): Promise<ScenarioInfo[]> {
  const builtIn = await discoverBuiltInScenarios()
  const local: ScenarioInfo[] = []

  // Also check CWD for a .vibe/ directory (interviewer running from their project)
  const cwd = process.cwd()
  const cwdScenario = await discoverSingleScenario(cwd)
  if (cwdScenario) {
    local.push(cwdScenario)
  }

  for (const path of localPaths) {
    const found = await discoverLocalScenarios(path)
    local.push(...found)
  }

  return [...local, ...builtIn]
}
