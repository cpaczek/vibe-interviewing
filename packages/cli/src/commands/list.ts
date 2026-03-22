import type { Command } from 'commander'
import chalk from 'chalk'
import { discoverAllScenarios } from '@vibe-interviewing/core'
import * as log from '../utils/logger.js'

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List available scenarios')
    .action(async () => {
      try {
        const scenarios = await discoverAllScenarios()
        console.log(chalk.bold('\nAvailable Scenarios:'))

        if (scenarios.length === 0) {
          log.info('No scenarios found.')
        } else {
          console.log()
          for (const s of scenarios) {
            const badge = s.builtIn ? chalk.dim(' [built-in]') : ''
            const meta = chalk.dim(`${s.config.difficulty} | ~${s.config.estimated_time}`)
            console.log(`  ${chalk.cyan(s.config.name)}${badge}`)
            console.log(`    ${meta}`)
            if (s.config.description) {
              console.log(`    ${s.config.description}`)
            } else {
              // Show first line of briefing as description
              const firstLine = s.config.briefing.split('\n')[0]?.trim()
              if (firstLine) {
                console.log(`    ${chalk.dim(firstLine)}`)
              }
            }
            console.log()
          }
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}
