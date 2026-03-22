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

/**
 * Format an error with user-friendly messages and return an exit code.
 * Does not call process.exit — callers decide whether to exit.
 */
export function formatError(err: unknown): number {
  if (err instanceof VibeError) {
    error(err.message)
    if (err.hint) {
      console.error(chalk.dim(`  ${err.hint}`))
    }
    return 1
  }

  if (err instanceof Error) {
    error(err.message)
    if (process.env['DEBUG']) {
      console.error(err.stack)
    }
    return 1
  }

  error(String(err))
  return 1
}

/** Handle errors with user-friendly messages and exit */
export function handleError(err: unknown): never {
  const code = formatError(err)
  process.exit(code)
}
