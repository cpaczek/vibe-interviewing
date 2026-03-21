import chalk from 'chalk'
import { VibeError } from '@vibe-interviewing/core'

export function info(message: string): void {
  console.log(chalk.cyan('i'), message)
}

export function success(message: string): void {
  console.log(chalk.green('✓'), message)
}

export function warn(message: string): void {
  console.log(chalk.yellow('!'), message)
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message)
}

/** Handle errors with user-friendly messages */
export function handleError(err: unknown): void {
  if (err instanceof VibeError) {
    error(err.message)
    if (err.hint) {
      console.error(chalk.dim(`  ${err.hint}`))
    }
    process.exit(1)
  }

  if (err instanceof Error) {
    error(err.message)
    if (process.env['DEBUG']) {
      console.error(err.stack)
    }
    process.exit(1)
  }

  error(String(err))
  process.exit(1)
}
