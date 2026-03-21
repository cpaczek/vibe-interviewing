import type { Command } from 'commander'
import chalk from 'chalk'
import { discoverAllScenarios, listActiveSessions } from '@vibe-interviewing/core'
import * as log from '../utils/logger.js'

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List available scenarios and active sessions')
    .option('--active', 'Show only active sessions')
    .option('--scenarios', 'Show only available scenarios')
    .action(async (options: { active?: boolean; scenarios?: boolean }) => {
      try {
        const showAll = !options.active && !options.scenarios

        // Show scenarios
        if (showAll || options.scenarios) {
          const scenarios = await discoverAllScenarios()
          console.log(chalk.bold('\nAvailable Scenarios:'))

          if (scenarios.length === 0) {
            log.info('No scenarios found.')
            log.info(`Create one with: ${chalk.cyan('vibe-interviewing init')}`)
          } else {
            console.log()
            for (const s of scenarios) {
              const badge = s.builtIn ? chalk.dim(' [built-in]') : ''
              const meta = chalk.dim(
                `${s.config.type} | ${s.config.difficulty} | ~${s.config.estimated_time}`,
              )
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
        }

        // Show active sessions
        if (showAll || options.active) {
          const sessions = await listActiveSessions()
          console.log(chalk.bold('Active Sessions:'))

          if (sessions.length === 0) {
            log.info('No active sessions.')
          } else {
            console.log()
            console.log(
              chalk.dim('  ID        Scenario                       Started         Status'),
            )
            for (const s of sessions) {
              const elapsed = getTimeAgo(s.createdAt)
              console.log(
                `  ${s.id.slice(0, 8).padEnd(10)}${s.scenarioName.slice(0, 30).padEnd(31)}${elapsed.padEnd(16)}${s.status}`,
              )
            }
          }
          console.log()
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
