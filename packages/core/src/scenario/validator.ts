import { ScenarioValidationError } from '../errors.js'
import type { ScenarioConfig } from './types.js'

/** Result of validating a scenario configuration */
export interface ValidationResult {
  /** Whether the scenario is valid (no errors) */
  valid: boolean
  /** Non-fatal issues that should be addressed */
  warnings: string[]
  /** Fatal issues that prevent the scenario from running */
  errors: string[]
}

/**
 * Validate a scenario config for completeness and correctness.
 *
 * @param config - The scenario config to validate
 * @returns Validation result with errors and warnings
 */
export function validateScenario(config: ScenarioConfig): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check briefing is not empty
  if (!config.briefing.trim()) {
    errors.push('Briefing cannot be empty')
  }

  // Check AI rules
  if (!config.ai_rules.role.trim()) {
    errors.push('ai_rules.role cannot be empty')
  }

  // Check repo is not empty
  if (!config.repo.trim()) {
    errors.push('repo cannot be empty')
  }

  // Check commit is a valid SHA
  if (!config.commit.trim()) {
    errors.push('commit cannot be empty — pin to a specific commit SHA for reproducibility')
  } else if (!/^[0-9a-f]{7,40}$/i.test(config.commit.trim())) {
    errors.push(
      'commit must be a hex SHA (7-40 characters) — branch/tag names are not allowed for reproducibility',
    )
  }

  // Warnings for non-critical missing content
  if (config.ai_rules.rules.length === 0) {
    warnings.push('ai_rules.rules is empty — the AI will have no behavioral constraints')
  }

  if (!config.solution.trim()) {
    warnings.push('solution is empty — interviewers will have no solution reference')
  }

  if (!config.evaluation) {
    warnings.push('No evaluation criteria defined')
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

/**
 * Validate a scenario config and throw if invalid.
 *
 * @param config - The scenario config to validate
 * @returns Validation result (only returned if valid)
 * @throws ScenarioValidationError if the config has errors
 */
export function validateScenarioOrThrow(config: ScenarioConfig): ValidationResult {
  const result = validateScenario(config)
  if (!result.valid) {
    throw new ScenarioValidationError('scenario validation failed', result.errors)
  }
  return result
}
