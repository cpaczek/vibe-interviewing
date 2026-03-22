import type { Command } from 'commander'
import { execSync } from 'node:child_process'
import chalk from 'chalk'
import { UpdateError } from '@vibe-interviewing/core'
import { createSpinner } from '../ui/spinner.js'
import * as log from '../utils/logger.js'
import {
  fetchLatestVersion,
  detectInstallMethod,
  getUpdateCommand,
  isNewer,
} from '../utils/version-check.js'

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Update vibe-interviewing to the latest version')
    .action(async () => {
      try {
        const spinner = createSpinner('Checking for updates...')
        spinner.start()

        const currentVersion = program.version() ?? '0.0.0'
        const latest = await fetchLatestVersion('vibe-interviewing', 10000)

        if (!latest) {
          spinner.fail('Could not check for updates')
          log.warn('Unable to reach the npm registry. Check your network connection.')
          return
        }

        if (!isNewer(latest, currentVersion)) {
          spinner.succeed(`Already on the latest version (${currentVersion})`)
          return
        }

        const method = detectInstallMethod()

        if (method.manager === 'npx') {
          spinner.succeed('Update available')
          log.info(
            `You're using npx. Run ${chalk.bold(`npx vibe-interviewing@${latest}`)} to use the latest version.`,
          )
          return
        }

        const updateCmd = getUpdateCommand(method)
        spinner.succeed(`Update available: ${chalk.dim(currentVersion)} → ${chalk.bold(latest)}`)
        console.log()
        log.info(`Updating via ${chalk.bold(method.manager)}...`)
        console.log()

        try {
          execSync(updateCmd, { stdio: 'inherit' })
          console.log()
          log.success(`Updated to ${latest}`)
        } catch {
          throw new UpdateError(`Command failed: ${updateCmd}`)
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}
