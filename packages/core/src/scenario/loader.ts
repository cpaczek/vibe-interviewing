import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { ScenarioNotFoundError, ScenarioValidationError } from '../errors.js'
import { ScenarioConfigSchema, type ScenarioConfig } from './types.js'
import { existsSync } from 'node:fs'

/**
 * Load and parse a scenario config from a YAML file.
 *
 * @param configPath - Absolute path to the scenario.yaml file
 * @returns The parsed and validated scenario config
 */
export async function loadScenarioConfig(configPath: string): Promise<ScenarioConfig> {
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

/**
 * Generate a system prompt string from a scenario's ai_rules.
 *
 * This prompt is injected into the AI tool via --append-system-prompt
 * and is hidden from the candidate.
 *
 * @param config - The scenario config containing ai_rules
 * @returns The formatted system prompt
 */
export function generateSystemPrompt(config: ScenarioConfig): string {
  const lines: string[] = []

  lines.push(`# Interview Scenario: ${config.name}`)
  lines.push('')
  lines.push('## Your Role')
  lines.push(config.ai_rules.role.trim())
  lines.push('')
  lines.push('## Rules')
  for (const rule of config.ai_rules.rules) {
    lines.push(`- ${rule}`)
  }
  lines.push('')
  lines.push('## Knowledge (DO NOT share directly with the candidate)')
  lines.push(config.ai_rules.knowledge.trim())

  return lines.join('\n')
}
