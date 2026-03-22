import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { loadScenarioConfig } from './loader.js'
import type { ScenarioInfo } from './types.js'

/** Shape of a single entry in registry.yaml */
interface RegistryEntry {
  name: string
  repo: string
  commit: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_time: string
}

/** Shape of the registry.yaml file */
interface RegistryFile {
  scenarios: RegistryEntry[]
}

/**
 * Get the path to the scenarios package directory.
 *
 * Resolves via the @vibe-interviewing/scenarios package, which works both
 * in the monorepo (workspace link) and when installed from npm.
 */
async function getScenariosPackagePath(): Promise<string> {
  try {
    const { getScenariosDir } = await import('@vibe-interviewing/scenarios')
    return getScenariosDir()
  } catch {
    // Fallback: try relative to process.cwd() (monorepo root)
    const fromCwd = join(process.cwd(), 'packages', 'scenarios')
    if (existsSync(fromCwd)) {
      return fromCwd
    }
    throw new Error('Could not locate @vibe-interviewing/scenarios package')
  }
}

/**
 * Discover built-in scenarios from the registry.yaml file in the scenarios package.
 *
 * Each entry in the registry points to a scenario directory containing a full
 * scenario.yaml. The registry provides quick lookup metadata, while the full
 * config is loaded from the scenario's own config file.
 *
 * @returns Array of discovered scenario info objects
 */
export async function discoverBuiltInScenarios(): Promise<ScenarioInfo[]> {
  const scenariosPath = await getScenariosPackagePath()
  const registryPath = join(scenariosPath, 'registry.yaml')

  if (!existsSync(registryPath)) {
    return []
  }

  const raw = await readFile(registryPath, 'utf-8')
  const registry = parseYaml(raw) as RegistryFile

  if (!registry.scenarios || !Array.isArray(registry.scenarios)) {
    return []
  }

  const scenarios: ScenarioInfo[] = []

  for (const entry of registry.scenarios) {
    // Load the full config from the scenario's own directory
    const scenarioConfigPath = join(scenariosPath, entry.name, 'scenario.yaml')

    if (existsSync(scenarioConfigPath)) {
      const config = await loadScenarioConfig(scenarioConfigPath)
      scenarios.push({
        name: entry.name,
        config,
        builtIn: true,
      })
    }
  }

  return scenarios
}

/**
 * Discover all available scenarios.
 *
 * Currently returns only built-in scenarios from the registry.
 * Local scenario support can be added later.
 *
 * @returns Array of all discovered scenario info objects
 */
export async function discoverAllScenarios(): Promise<ScenarioInfo[]> {
  return discoverBuiltInScenarios()
}
