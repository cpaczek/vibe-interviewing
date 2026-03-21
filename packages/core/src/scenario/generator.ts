import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { existsSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type { ScenarioConfig } from './types.js'
import { ScenarioConfigSchema } from './types.js'
import { detectProject, type DetectedProject } from './auto-detect.js'

/** Options for generating a scenario */
export interface GenerateOptions {
  /** Path to the project directory */
  projectPath: string
  /** Scenario type */
  type: 'debug' | 'feature' | 'custom'
  /** Description of the bug to inject (for debug scenarios) */
  bugDescription?: string
  /** Description of the feature to build (for feature scenarios) */
  featureDescription?: string
  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard'
  /** Estimated time */
  estimatedTime?: string
}

/** Result of scenario generation */
export interface GeneratedScenario {
  /** The scenario config */
  config: ScenarioConfig
  /** System prompt content */
  systemPrompt: string
  /** Solution document */
  solution: string
  /** Evaluation rubric */
  evaluation: string
  /** Dockerfile content (if generated) */
  dockerfile?: string
  /** Code modifications to apply (for debug scenarios) */
  modifications?: Array<{
    file: string
    content: string
  }>
}

/** Generate a scenario using the Anthropic API */
export async function generateScenario(options: GenerateOptions): Promise<GeneratedScenario> {
  // Lazy import to make @anthropic-ai/sdk optional
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Anthropic: any
  try {
    // Use a variable to prevent TypeScript from resolving the module at build time
    const sdkName = '@anthropic-ai/sdk'
    const mod = await import(sdkName)
    Anthropic = mod.default
  } catch {
    throw new Error(
      'The @anthropic-ai/sdk package is required for scenario generation.\n' +
        'Install it with: npm install @anthropic-ai/sdk\n' +
        'And set your ANTHROPIC_API_KEY environment variable.',
    )
  }

  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required for scenario generation.\n' +
        'Get your API key at: https://console.anthropic.com/',
    )
  }

  const client = new Anthropic({ apiKey })

  // Gather project context
  const detected = await detectProject(options.projectPath)
  const fileTree = await buildFileTree(options.projectPath)
  const keyFiles = await readKeyFiles(options.projectPath, detected.language)

  const prompt = buildGenerationPrompt(options, detected, fileTree, keyFiles)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  return parseGeneratedResponse(text)
}

/** Build a file tree string for the project */
async function buildFileTree(
  dir: string,
  prefix = '',
  maxDepth = 3,
  currentDepth = 0,
): Promise<string> {
  if (currentDepth >= maxDepth) return ''

  const entries = await readdir(dir, { withFileTypes: true })
  const lines: string[] = []

  const filtered = entries.filter(
    (e) =>
      !e.name.startsWith('.') &&
      e.name !== 'node_modules' &&
      e.name !== '__pycache__' &&
      e.name !== 'dist' &&
      e.name !== 'build',
  )

  for (const entry of filtered) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      lines.push(`${prefix}${entry.name}/`)
      const sub = await buildFileTree(path, prefix + '  ', maxDepth, currentDepth + 1)
      if (sub) lines.push(sub)
    } else {
      lines.push(`${prefix}${entry.name}`)
    }
  }

  return lines.join('\n')
}

/** Read key source files for context */
async function readKeyFiles(projectPath: string, language: string): Promise<string> {
  const files: string[] = []

  const candidates: Record<string, string[]> = {
    node: [
      'package.json',
      'src/index.ts',
      'src/index.js',
      'src/app.ts',
      'src/app.js',
      'index.ts',
      'index.js',
    ],
    python: ['requirements.txt', 'pyproject.toml', 'src/main.py', 'main.py', 'app.py'],
    go: ['go.mod', 'main.go', 'cmd/main.go'],
    rust: ['Cargo.toml', 'src/main.rs', 'src/lib.rs'],
  }

  const filesToCheck = candidates[language] ?? candidates['node']!

  for (const candidate of filesToCheck) {
    const fullPath = join(projectPath, candidate)
    if (existsSync(fullPath)) {
      try {
        const s = await stat(fullPath)
        if (s.size < 50000) {
          const content = await readFile(fullPath, 'utf-8')
          files.push(`--- ${candidate} ---\n${content}`)
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  // Also read up to 5 additional source files
  const srcFiles = await findSourceFiles(projectPath, language)
  for (const file of srcFiles.slice(0, 5)) {
    const relPath = relative(projectPath, file)
    if (filesToCheck.includes(relPath)) continue
    try {
      const s = await stat(file)
      if (s.size < 30000) {
        const content = await readFile(file, 'utf-8')
        files.push(`--- ${relPath} ---\n${content}`)
      }
    } catch {
      // Skip
    }
  }

  return files.join('\n\n')
}

/** Find source files in the project */
async function findSourceFiles(dir: string, language: string, maxFiles = 10): Promise<string[]> {
  const extensionMap: Record<string, string[]> = {
    node: ['.ts', '.js', '.tsx', '.jsx'],
    python: ['.py'],
    go: ['.go'],
    rust: ['.rs'],
  }
  const extensions = extensionMap[language] ?? ['.ts', '.js', '.py']
  const results: string[] = []

  async function walk(d: string, depth: number): Promise<void> {
    if (depth > 4 || results.length >= maxFiles) return

    const entries = await readdir(d, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (results.length >= maxFiles) break
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        continue
      }

      const fullPath = join(d, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1)
      } else if (extensions.includes(extname(entry.name))) {
        results.push(fullPath)
      }
    }
  }

  await walk(dir, 0)
  return results
}

/** Build the prompt for Claude to generate a scenario */
function buildGenerationPrompt(
  options: GenerateOptions,
  detected: DetectedProject,
  fileTree: string,
  keyFiles: string,
): string {
  const typeInstruction =
    options.type === 'debug'
      ? `INJECT A BUG: ${options.bugDescription ?? 'Create a subtle, realistic bug that would take a competent engineer with AI assistance about 30-45 minutes to find. NOT a syntax error — think race conditions, off-by-one errors, incorrect algorithm selection under edge cases, time-dependent behavior, etc.'}`
      : options.type === 'feature'
        ? `DESIGN A FEATURE: ${options.featureDescription ?? 'Design a feature that naturally extends this codebase. The candidate should be able to implement it in 30-60 minutes with AI assistance. Include failing tests that define the spec.'}`
        : `CUSTOM SCENARIO: ${options.bugDescription ?? options.featureDescription ?? 'Create an interesting technical challenge based on this codebase.'}`

  const defaultPort = detected.ports[0]?.split(':')[0] ?? '3000'
  const setupCmd =
    detected.language === 'node'
      ? 'npm install'
      : detected.language === 'python'
        ? 'pip install -r requirements.txt'
        : 'echo "ready"'

  return `You are creating an interview scenario for vibe-interviewing. Analyze this codebase and generate a complete scenario.

## Project Info
- Language: ${detected.language}
- Package Manager: ${detected.packageManager ?? 'unknown'}
- Has Dockerfile: ${detected.hasDockerfile}
- Commands: ${detected.commands.join(', ')}
- Ports: ${detected.ports.join(', ')}

## File Tree
${fileTree}

## Key Files
${keyFiles}

## Instructions
${typeInstruction}

Difficulty: ${options.difficulty ?? 'medium'}
Estimated time: ${options.estimatedTime ?? '45m'}

## Output Format

Respond with EXACTLY this structure using XML tags:

<scenario_yaml>
name: "Short name"
version: "1.0.0"
description: "One-line description"
type: ${options.type}
difficulty: ${options.difficulty ?? 'medium'}
estimated_time: "${options.estimatedTime ?? '45m'}"
tags: [relevant, tags]
briefing: |
  Written like a real Slack message from a team lead explaining the problem.
  Include what to run and how to get started.
environment:
  dockerfile: ./Dockerfile
  ports: ${JSON.stringify(detected.ports)}
  commands: ${JSON.stringify(detected.commands)}
  setup_commands:
    - ${setupCmd}
  healthcheck:
    command: "curl -sf http://localhost:${defaultPort}/health || exit 1"
    interval: "2s"
    retries: 20
ai_context:
  role: |
    You are assisting a candidate in a technical interview.
  rules:
    - Do NOT reveal the root cause directly
    - Guide with questions, not answers
    - If stuck 10+ minutes, offer a hint
  knowledge: |
    Detailed knowledge of the bug/solution.
evaluation:
  criteria:
    - Process-focused evaluation criteria
  expected_solution: |
    What the correct solution looks like.
</scenario_yaml>

<system_prompt>
# Interview Scenario: [Name]

## Your Role
[role text]

## Rules
- [each rule]

## Knowledge (DO NOT share directly with the candidate)
[knowledge]
</system_prompt>

<solution>
# Solution: [Name]
[Detailed solution with code snippets and file paths]
</solution>

<evaluation>
# Evaluation: [Name]

## Criteria
- [criteria]

## Expected Solution
[expected solution]
</evaluation>

<dockerfile>
FROM [base image]
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
</dockerfile>

${options.type === 'debug' ? '<modifications>\n[JSON array: [{"file": "src/path.ts", "content": "full file content with bug injected"}]]\n</modifications>' : ''}

Generate realistic, high-quality content. The briefing should read like a real message from a team lead.`
}

/** Parse the generated scenario from Claude's response */
function parseGeneratedResponse(text: string): GeneratedScenario {
  const scenarioYaml = extractTag(text, 'scenario_yaml')
  const systemPrompt = extractTag(text, 'system_prompt')
  const solution = extractTag(text, 'solution')
  const evaluation = extractTag(text, 'evaluation')
  const dockerfile = extractTag(text, 'dockerfile')
  const modificationsRaw = extractTag(text, 'modifications')

  if (!scenarioYaml) {
    throw new Error('Failed to generate scenario: AI response did not contain scenario_yaml')
  }

  const parsed = parseYaml(scenarioYaml) as Record<string, unknown>
  const config = ScenarioConfigSchema.parse(parsed)

  let modifications: GeneratedScenario['modifications']
  if (modificationsRaw) {
    try {
      modifications = JSON.parse(modificationsRaw) as GeneratedScenario['modifications']
    } catch {
      // Skip invalid JSON
    }
  }

  return {
    config,
    systemPrompt: systemPrompt ?? '',
    solution: solution ?? '',
    evaluation: evaluation ?? '',
    dockerfile: dockerfile ?? undefined,
    modifications,
  }
}

/** Extract content between XML-like tags */
function extractTag(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i')
  const match = text.match(regex)
  return match?.[1]?.trim() ?? null
}
