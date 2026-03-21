import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ScenarioValidationError } from '../errors.js'
import type { ScenarioConfig } from './types.js'
import { resolveVibeDir } from './loader.js'

export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/** Validate a scenario config and its associated files */
export async function validateScenario(
  scenarioPath: string,
  config: ScenarioConfig,
): Promise<ValidationResult> {
  const warnings: string[] = []
  const errors: string[] = []
  const vibeDir = resolveVibeDir(scenarioPath)

  // Check Dockerfile or image exists
  if (config.environment.dockerfile) {
    const dockerfilePath = join(vibeDir, config.environment.dockerfile)
    if (!existsSync(dockerfilePath)) {
      errors.push(`Dockerfile not found: ${dockerfilePath}`)
    }
  } else if (!config.environment.image) {
    errors.push('Either environment.dockerfile or environment.image must be specified')
  }

  // Check briefing is not empty
  if (!config.briefing.trim()) {
    errors.push('Briefing cannot be empty')
  }

  // Check AI context
  if (!config.ai_context.role.trim()) {
    errors.push('ai_context.role cannot be empty')
  }
  if (config.ai_context.rules.length === 0) {
    warnings.push('ai_context.rules is empty — the AI will have no behavioral constraints')
  }
  if (!config.ai_context.knowledge.trim()) {
    warnings.push('ai_context.knowledge is empty — the AI will have no solution knowledge')
  }

  // Check evaluation
  if (!config.evaluation) {
    warnings.push('No evaluation criteria defined')
  }

  // Check commands
  if (config.environment.commands.length === 0) {
    warnings.push('No commands defined for transparent Docker wrapping')
  }

  // Check solution file exists
  const solutionPath = join(vibeDir, 'solution.md')
  if (!existsSync(solutionPath)) {
    warnings.push('No solution.md found — interviewers will have no solution reference')
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

/** Validate and throw if invalid */
export async function validateScenarioOrThrow(
  scenarioPath: string,
  config: ScenarioConfig,
): Promise<ValidationResult> {
  const result = await validateScenario(scenarioPath, config)
  if (!result.valid) {
    throw new ScenarioValidationError('scenario validation failed', result.errors)
  }
  return result
}
