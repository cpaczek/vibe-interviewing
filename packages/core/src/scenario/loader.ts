import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { ScenarioNotFoundError, ScenarioValidationError } from '../errors.js'
import { ScenarioConfigSchema, type ScenarioConfig } from './types.js'
import { existsSync } from 'node:fs'

/** Resolve the .vibe directory for a scenario path */
export function resolveVibeDir(scenarioPath: string): string {
  const vibeDir = join(scenarioPath, '.vibe')
  if (existsSync(vibeDir)) {
    return vibeDir
  }
  // Fallback: scenario.yaml might be at root level (for built-in scenarios)
  if (existsSync(join(scenarioPath, 'scenario.yaml'))) {
    return scenarioPath
  }
  throw new ScenarioNotFoundError(scenarioPath)
}

/** Load and parse a scenario config from a directory */
export async function loadScenarioConfig(scenarioPath: string): Promise<ScenarioConfig> {
  const vibeDir = resolveVibeDir(scenarioPath)
  const configPath = join(vibeDir, 'scenario.yaml')

  if (!existsSync(configPath)) {
    throw new ScenarioNotFoundError(configPath)
  }

  const raw = await readFile(configPath, 'utf-8')
  const parsed: unknown = parseYaml(raw)

  const result = ScenarioConfigSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
    throw new ScenarioValidationError('validation failed', issues)
  }

  return result.data
}

/** Load the system prompt file for a scenario */
export async function loadSystemPrompt(scenarioPath: string): Promise<string> {
  const vibeDir = resolveVibeDir(scenarioPath)
  const promptPath = join(vibeDir, 'system-prompt.md')

  if (!existsSync(promptPath)) {
    // Generate from ai_context in scenario.yaml
    const config = await loadScenarioConfig(scenarioPath)
    return generateSystemPrompt(config)
  }

  return readFile(promptPath, 'utf-8')
}

/** Generate a system prompt from scenario AI context */
export function generateSystemPrompt(config: ScenarioConfig): string {
  const lines: string[] = []

  lines.push(`# Interview Scenario: ${config.name}`)
  lines.push('')
  lines.push('## Your Role')
  lines.push(config.ai_context.role.trim())
  lines.push('')
  lines.push('## Rules')
  for (const rule of config.ai_context.rules) {
    lines.push(`- ${rule}`)
  }
  lines.push('')
  lines.push('## Knowledge (DO NOT share directly with the candidate)')
  lines.push(config.ai_context.knowledge.trim())

  return lines.join('\n')
}

/** Load the solution file for a scenario (interviewer only) */
export async function loadSolution(scenarioPath: string): Promise<string | null> {
  const vibeDir = resolveVibeDir(scenarioPath)
  const solutionPath = join(vibeDir, 'solution.md')

  if (!existsSync(solutionPath)) {
    return null
  }

  return readFile(solutionPath, 'utf-8')
}

/** Load the evaluation rubric for a scenario (interviewer only) */
export async function loadEvaluation(scenarioPath: string): Promise<string | null> {
  const vibeDir = resolveVibeDir(scenarioPath)
  const evalPath = join(vibeDir, 'evaluation.md')

  if (!existsSync(evalPath)) {
    return null
  }

  return readFile(evalPath, 'utf-8')
}

/** Get the codebase directory for a scenario (what gets copied to workspace) */
export function getCodebasePath(scenarioPath: string): string {
  // If there's a .vibe/ dir, the codebase is everything else in the scenario dir
  // If there's no .vibe/ dir (built-in scenario), the codebase is in src/
  const vibeDir = join(scenarioPath, '.vibe')
  if (existsSync(vibeDir)) {
    return scenarioPath
  }
  const srcDir = join(scenarioPath, 'src')
  if (existsSync(srcDir)) {
    return srcDir
  }
  return scenarioPath
}
