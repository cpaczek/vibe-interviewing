import type { Command } from 'commander'
import chalk from 'chalk'
import boxen from 'boxen'
import {
  loadScenarioConfig,
  loadSolution,
  loadEvaluation,
  generateSystemPrompt,
  discoverAllScenarios,
} from '@vibe-interviewing/core'
import { selectScenario } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerPreviewCommand(program: Command): void {
  program
    .command('preview')
    .description('Preview a scenario — shows solution and evaluation rubric (interviewer only)')
    .argument('[path]', 'Path to scenario directory')
    .action(async (scenarioPath?: string) => {
      try {
        let resolvedPath: string

        if (scenarioPath) {
          resolvedPath = scenarioPath
        } else {
          const scenarios = await discoverAllScenarios()
          if (scenarios.length === 0) {
            log.error('No scenarios found.')
            return
          }
          const selected = await selectScenario(scenarios)
          resolvedPath = selected.path
        }

        const config = await loadScenarioConfig(resolvedPath)

        // Show scenario info
        console.log(
          boxen(
            `${chalk.bold(config.name)}\n${chalk.dim(`${config.type} | ${config.difficulty} | ~${config.estimated_time}`)}`,
            { padding: 1, borderStyle: 'round', borderColor: 'cyan' },
          ),
        )

        // Show briefing
        console.log(chalk.bold('\nBriefing (what the candidate sees):'))
        console.log(chalk.dim('─'.repeat(60)))
        console.log(config.briefing)

        // Show AI system prompt
        console.log(chalk.bold('\nAI System Prompt (hidden from candidate):'))
        console.log(chalk.dim('─'.repeat(60)))
        console.log(chalk.yellow(generateSystemPrompt(config)))

        // Show solution
        const solution = await loadSolution(resolvedPath)
        if (solution) {
          console.log(chalk.bold('\nSolution:'))
          console.log(chalk.dim('─'.repeat(60)))
          console.log(chalk.green(solution))
        }

        // Show evaluation
        const evaluation = await loadEvaluation(resolvedPath)
        if (evaluation) {
          console.log(chalk.bold('\nEvaluation Rubric:'))
          console.log(chalk.dim('─'.repeat(60)))
          console.log(evaluation)
        } else if (config.evaluation) {
          console.log(chalk.bold('\nEvaluation Criteria:'))
          console.log(chalk.dim('─'.repeat(60)))
          for (const criterion of config.evaluation.criteria) {
            console.log(`  - ${criterion}`)
          }
          if (config.evaluation.expected_solution) {
            console.log(chalk.bold('\nExpected Solution:'))
            console.log(config.evaluation.expected_solution)
          }
        }

        console.log()
      } catch (err) {
        log.handleError(err)
      }
    })
}
