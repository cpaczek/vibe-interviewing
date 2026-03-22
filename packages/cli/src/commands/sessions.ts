import type { Command } from 'commander'
import chalk from 'chalk'
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { listSessions, deleteSession } from '@vibe-interviewing/core'
import { confirmAction } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerSessionsCommand(program: Command): void {
  const sessions = program.command('sessions').description('Manage interview sessions')

  sessions
    .command('list')
    .alias('ls')
    .description('List all recorded sessions')
    .option('--all', 'Include completed sessions', false)
    .action(async (options: { all: boolean }) => {
      try {
        const allSessions = await listSessions()
        const filtered = options.all
          ? allSessions
          : allSessions.filter((s) => s.status !== 'complete')

        if (filtered.length === 0) {
          log.info(
            options.all
              ? 'No sessions found.'
              : 'No active sessions. Use --all to include completed sessions.',
          )
          return
        }

        console.log(chalk.bold(`\n${options.all ? 'All' : 'Active'} Sessions:\n`))
        for (const s of filtered) {
          const statusColor =
            s.status === 'running'
              ? chalk.green
              : s.status === 'complete'
                ? chalk.dim
                : chalk.yellow
          const age = formatAge(s.createdAt)
          console.log(`  ${chalk.cyan(s.id)}  ${statusColor(s.status)}  ${chalk.dim(age)}`)
          console.log(`    ${s.scenarioName}`)
          console.log(`    ${chalk.dim(s.workdir)}`)
          console.log()
        }
      } catch (err) {
        log.handleError(err)
      }
    })

  sessions
    .command('clean')
    .description('Remove completed sessions and their workspace directories')
    .option('--dry-run', 'Show what would be removed without removing it')
    .action(async (options: { dryRun: boolean }) => {
      try {
        const allSessions = await listSessions()
        const completed = allSessions.filter((s) => s.status === 'complete')

        if (completed.length === 0) {
          log.info('No completed sessions to clean up.')
          return
        }

        console.log(chalk.bold(`\nCompleted sessions to clean (${completed.length}):\n`))
        for (const s of completed) {
          const dirExists = existsSync(s.workdir)
          console.log(`  ${chalk.cyan(s.id)}  ${s.scenarioName}`)
          console.log(
            `    ${chalk.dim(s.workdir)}${dirExists ? '' : chalk.dim(' (already removed)')}`,
          )
        }
        console.log()

        if (options.dryRun) {
          log.info('Dry run — nothing was removed.')
          return
        }

        const confirmed = await confirmAction(
          `Remove ${completed.length} completed session(s) and their workspaces?`,
        )
        if (!confirmed) return

        for (const s of completed) {
          if (existsSync(s.workdir)) {
            await rm(s.workdir, { recursive: true, force: true })
          }
          await deleteSession(s.id)
        }

        log.success(`Cleaned ${completed.length} session(s).`)
      } catch (err) {
        log.handleError(err)
      }
    })
}

function formatAge(isoString: string): string {
  const elapsed = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(elapsed / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
