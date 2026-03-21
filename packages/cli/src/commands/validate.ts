import type { Command } from 'commander'
import chalk from 'chalk'
import { loadScenarioConfig, validateScenario } from '@vibe-interviewing/core'
import * as log from '../utils/logger.js'

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate a scenario configuration')
    .argument('<path>', 'Path to scenario directory')
    .action(async (scenarioPath: string) => {
      try {
        // Load config
        const config = await loadScenarioConfig(scenarioPath)
        log.success(`Parsed scenario: ${config.name}`)

        // Validate
        const result = await validateScenario(scenarioPath, config)

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'))
          for (const w of result.warnings) {
            log.warn(w)
          }
        }

        if (result.errors.length > 0) {
          console.log(chalk.red('\nErrors:'))
          for (const e of result.errors) {
            log.error(e)
          }
        }

        if (result.valid) {
          console.log()
          log.success('Scenario is valid!')
        } else {
          console.log()
          log.error('Scenario has errors that must be fixed.')
          process.exit(1)
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}
