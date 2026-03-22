import { z } from 'zod'

const AIRulesSchema = z.object({
  /** Role description for the AI assistant */
  role: z.string(),
  /** Behavioral rules (e.g., "don't reveal the answer") */
  rules: z.array(z.string()),
  /** Knowledge about the bug/solution (hidden from candidate) */
  knowledge: z.string(),
})

const EvaluationSchema = z.object({
  /** Evaluation criteria for the interviewer */
  criteria: z.array(z.string()),
  /** Description of the expected fix */
  expected_fix: z.string().optional(),
})

/** A file modification to inject the bug */
const PatchSchema = z.object({
  /** Path to the file relative to repo root */
  file: z.string(),
  /** The original text to find */
  find: z.string(),
  /** The replacement text (with the bug) */
  replace: z.string(),
})

/** Full scenario configuration schema */
export const ScenarioConfigSchema = z.object({
  /** Scenario display name */
  name: z.string(),
  /** One-line description */
  description: z.string(),
  /** Difficulty level */
  difficulty: z.enum(['easy', 'medium', 'hard']),
  /** Estimated time (e.g., "30-45m") */
  estimated_time: z.string(),
  /** Searchable tags */
  tags: z.array(z.string()).default([]),

  /** GitHub repo URL or owner/repo shorthand */
  repo: z.string(),
  /** Commit SHA to pin the clone to (ensures reproducibility) */
  commit: z.string(),
  /** Shell commands to run after cloning (e.g., ["npm install"]) */
  setup: z.array(z.string()).default([]),

  /** Find-and-replace patches to inject the bug after cloning */
  patch: z.array(PatchSchema).default([]),

  /** Briefing shown to the candidate (written like a team lead message) */
  briefing: z.string(),
  /** AI behavioral rules (injected via system prompt, hidden from candidate) */
  ai_rules: AIRulesSchema,
  /** Interviewer reference — what the fix looks like */
  solution: z.string(),

  /** Evaluation rubric */
  evaluation: EvaluationSchema.optional(),
  /** License of the original project */
  license: z.string().optional(),
})

export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>
export type AIRules = z.infer<typeof AIRulesSchema>
export type Evaluation = z.infer<typeof EvaluationSchema>

/** Metadata about a discovered scenario */
export interface ScenarioInfo {
  /** Scenario name */
  name: string
  /** Parsed config */
  config: ScenarioConfig
  /** Whether this is a built-in scenario */
  builtIn: boolean
}
