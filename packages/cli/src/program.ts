import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import boxen from 'boxen'
import chalk from 'chalk'
import { registerStartCommand } from './commands/start.js'
import { registerHostCommand } from './commands/host.js'
import { registerJoinCommand } from './commands/join.js'
import { registerListCommand } from './commands/list.js'
import { registerValidateCommand } from './commands/validate.js'
import { registerSessionsCommand } from './commands/sessions.js'
import { registerSetupCommand } from './commands/setup.js'
import { registerUpdateCommand } from './commands/update.js'
import { checkForUpdate } from './utils/version-check.js'

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as {
      version: string
    }
    return pkg.version
  } catch {
    return '0.0.0'
  }
}

export function createProgram(): Command {
  const program = new Command()

  program
    .name('vibe-interviewing')
    .description(
      'AI-era technical interviews — evaluate how engineers work with AI, not what they memorize',
    )
    .version(getVersion())

  registerStartCommand(program)
  registerHostCommand(program)
  registerJoinCommand(program)
  registerListCommand(program)
  registerValidateCommand(program)
  registerSessionsCommand(program)
  registerSetupCommand(program)
  registerUpdateCommand(program)

  // Non-blocking version check on every command (except update/setup)
  program.hook('preAction', (thisCommand) => {
    const cmdName = thisCommand.args?.[0] ?? thisCommand.name()
    if (cmdName === 'update' || cmdName === 'setup') return

    const currentVersion = program.version()
    if (!currentVersion) return

    checkForUpdate(currentVersion)
      .then((info) => {
        if (info) {
          process.on('beforeExit', () => {
            console.log()
            console.log(
              boxen(
                `Update available: ${chalk.dim(info.currentVersion)} → ${chalk.bold(info.latestVersion)}\nRun: ${chalk.cyan(info.updateCommand)}`,
                {
                  padding: { top: 0, bottom: 0, left: 1, right: 1 },
                  borderColor: 'yellow',
                  borderStyle: 'round',
                },
              ),
            )
          })
        }
      })
      .catch(() => {
        // Version check is best-effort — silently ignore failures
      })
  })

  return program
}
