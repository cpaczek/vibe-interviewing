import { readFile } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { ScenarioNotFoundError, ScenarioValidationError, ScenarioFetchError } from '../errors.js'
import { ScenarioConfigSchema, type ScenarioConfig } from './types.js'
import { existsSync } from 'node:fs'

const MAX_RESPONSE_BYTES = 1_048_576 // 1 MB
const FETCH_TIMEOUT_MS = 15_000

/**
 * Check whether a string looks like a URL (http:// or https://).
 *
 * @param input - The string to test
 * @returns true if the string starts with http:// or https://
 */
export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://')
}

/**
 * Convert a GitHub blob URL to a raw content URL.
 *
 * @example
 * toGitHubRawUrl('https://github.com/owner/repo/blob/main/scenario.yaml')
 * // => 'https://raw.githubusercontent.com/owner/repo/main/scenario.yaml'
 */
function toGitHubRawUrl(url: string): string {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/(.+)$/)
  if (match) {
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}`
  }
  return url
}

/**
 * Fetch scenario YAML from a URL.
 *
 * @param url - The URL to fetch (GitHub blob URLs are auto-converted to raw)
 * @returns The YAML text
 * @throws ScenarioFetchError on network failure, timeout, or oversized response
 */
async function fetchScenarioYaml(url: string): Promise<string> {
  const rawUrl = toGitHubRawUrl(url)

  let response: Response
  try {
    response = await fetch(rawUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'text/plain, application/x-yaml, */*' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    throw new ScenarioFetchError(url, message)
  }

  if (!response.ok) {
    throw new ScenarioFetchError(url, `HTTP ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    throw new ScenarioFetchError(url, 'response too large (>1 MB)')
  }

  const text = await response.text()
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new ScenarioFetchError(url, 'response too large (>1 MB)')
  }

  return text
}

/**
 * Parse and validate scenario YAML text into a ScenarioConfig.
 *
 * @param raw - Raw YAML text
 * @param source - Source identifier (file path or URL) for error messages
 * @returns The parsed and validated scenario config
 */
function parseScenarioYaml(raw: string, source: string): ScenarioConfig {
  const parsed: unknown = parseYaml(raw)

  const result = ScenarioConfigSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
    throw new ScenarioValidationError(`validation failed (${source})`, issues)
  }

  return result.data
}

/**
 * Load and parse a scenario config from a YAML file or URL.
 *
 * Accepts either a local file path or an HTTP(S) URL. GitHub blob URLs
 * are automatically converted to raw content URLs.
 *
 * @param pathOrUrl - Absolute path to a scenario.yaml file, or a URL
 * @returns The parsed and validated scenario config
 */
export async function loadScenarioConfig(pathOrUrl: string): Promise<ScenarioConfig> {
  if (isUrl(pathOrUrl)) {
    const raw = await fetchScenarioYaml(pathOrUrl)
    return parseScenarioYaml(raw, pathOrUrl)
  }

  if (!existsSync(pathOrUrl)) {
    throw new ScenarioNotFoundError(pathOrUrl)
  }

  const raw = await readFile(pathOrUrl, 'utf-8')
  return parseScenarioYaml(raw, pathOrUrl)
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

  // Type-specific context
  const typeDescriptions: Record<string, string> = {
    debug:
      'The candidate is debugging a bug in this codebase. Guide them through the debugging process without revealing the answer.',
    feature:
      'The candidate is building a new feature. Help them understand the requirements, plan their approach, and implement it. Offer architectural guidance but let them drive the implementation.',
    refactor:
      'The candidate is improving existing code. Help them identify issues and plan improvements. Encourage them to explain their reasoning for changes.',
  }
  lines.push('## Scenario Type')
  lines.push(typeDescriptions[config.type] ?? typeDescriptions['debug']!)
  lines.push('')

  lines.push('## Your Role')
  lines.push(config.ai_rules.role.trim())
  lines.push('')
  lines.push('## Rules')
  for (const rule of config.ai_rules.rules) {
    lines.push(`- ${rule}`)
  }
  lines.push('')

  const knowledgeHeaders: Record<string, string> = {
    debug: 'Knowledge (DO NOT share directly with the candidate)',
    feature: 'Implementation Context (DO NOT share directly with the candidate)',
    refactor: 'Improvement Context (DO NOT share directly with the candidate)',
  }
  lines.push(`## ${knowledgeHeaders[config.type] ?? knowledgeHeaders['debug']!}`)
  lines.push(config.ai_rules.knowledge.trim())

  return lines.join('\n')
}
