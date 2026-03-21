import { z } from 'zod'

const ServiceSchema = z.object({
  image: z.string(),
  ports: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
})

const HealthCheckSchema = z.object({
  command: z.string(),
  interval: z.string().default('2s'),
  retries: z.number().default(15),
})

const EnvironmentSchema = z.object({
  /** Path to Dockerfile relative to scenario dir */
  dockerfile: z.string().optional(),
  /** Docker image to use (alternative to dockerfile) */
  image: z.string().optional(),
  /** Port mappings (host:container) */
  ports: z.array(z.string()).default([]),
  /** Additional volume mounts */
  volumes: z.array(z.string()).default([]),
  /** Environment variables for the container */
  env: z.record(z.string()).default({}),
  /** Additional Docker Compose services (databases, caches, etc.) */
  services: z.record(ServiceSchema).default({}),
  /** Commands to wrap transparently via .vibe/bin/ */
  commands: z.array(z.string()).default([]),
  /** Commands to run inside the container after start */
  setup_commands: z.array(z.string()).default([]),
  /** Health check to wait for before launching AI tool */
  healthcheck: HealthCheckSchema.optional(),
})

const AIContextSchema = z.object({
  /** Role description for the AI */
  role: z.string(),
  /** Behavioral rules (e.g., "don't reveal the answer") */
  rules: z.array(z.string()),
  /** Knowledge about the bug/solution (hidden from candidate) */
  knowledge: z.string(),
})

const SourceSchema = z.object({
  /** GitHub repo in owner/name format */
  repo: z.string(),
  /** Git ref (tag, branch, or commit SHA) */
  ref: z.string().optional(),
  /** License of the source project */
  license: z.string(),
})

const ModificationsSchema = z.object({
  /** Description of what was changed */
  description: z.string(),
  /** List of files that were modified */
  files_changed: z.array(z.string()),
  /** Original injection prompt (for reproducibility) */
  injection_prompt: z.string().optional(),
})

const EvaluationSchema = z.object({
  /** Evaluation criteria for the interviewer */
  criteria: z.array(z.string()),
  /** Description of the expected solution */
  expected_solution: z.string().optional(),
})

/** Full scenario configuration schema */
export const ScenarioConfigSchema = z.object({
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  author: z.string().optional(),
  type: z.enum(['debug', 'feature', 'custom']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimated_time: z.string(),
  tags: z.array(z.string()).default([]),
  /** Source project info (for imported scenarios) */
  source: SourceSchema.optional(),
  /** Modifications made to the source (for imported scenarios) */
  modifications: ModificationsSchema.optional(),
  /** Briefing shown to the candidate */
  briefing: z.string(),
  /** Docker environment configuration */
  environment: EnvironmentSchema,
  /** AI behavioral context (hidden from candidate) */
  ai_context: AIContextSchema,
  /** Evaluation criteria for the interviewer */
  evaluation: EvaluationSchema.optional(),
})

export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>
export type Environment = z.infer<typeof EnvironmentSchema>
export type AIContext = z.infer<typeof AIContextSchema>
export type Evaluation = z.infer<typeof EvaluationSchema>
export type Service = z.infer<typeof ServiceSchema>

/** Metadata about a discovered scenario */
export interface ScenarioInfo {
  /** Scenario name */
  name: string
  /** Path to the scenario directory */
  path: string
  /** Parsed config */
  config: ScenarioConfig
  /** Whether this is a built-in scenario */
  builtIn: boolean
}
