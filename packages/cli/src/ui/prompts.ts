import { select, confirm } from '@inquirer/prompts'
import type { ScenarioInfo, DetectedTool } from '@vibe-interviewing/core'

/** Prompt user to select a scenario */
export async function selectScenario(scenarios: ScenarioInfo[]): Promise<ScenarioInfo> {
  const answer = await select({
    message: 'Select a scenario:',
    choices: scenarios.map((s) => {
      const badge = s.builtIn ? ' [built-in]' : ''
      const description = s.config.description ?? s.config.briefing.split('\n')[0]?.trim()
      return {
        name: `${s.config.name}${badge} — ${s.config.type}, ${s.config.difficulty}, ~${s.config.estimated_time}`,
        value: s,
        description,
      }
    }),
  })
  return answer
}

/** Prompt user to select an AI tool */
export async function selectAITool(tools: DetectedTool[]): Promise<DetectedTool> {
  if (tools.length === 1 && tools[0]) {
    return tools[0]
  }

  const answer = await select({
    message: 'Which AI tool should the candidate use?',
    choices: tools.map((t) => ({
      name: `${t.launcher.displayName}${t.version ? ` (${t.version})` : ''}`,
      value: t,
    })),
  })
  return answer
}

/** Confirm before proceeding */
export async function confirmAction(message: string): Promise<boolean> {
  return confirm({ message, default: true })
}
