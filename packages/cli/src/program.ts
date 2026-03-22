import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { registerStartCommand } from './commands/start.js'
import { registerHostCommand } from './commands/host.js'
import { registerJoinCommand } from './commands/join.js'
import { registerListCommand } from './commands/list.js'
import { registerValidateCommand } from './commands/validate.js'
import { registerSessionsCommand } from './commands/sessions.js'

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

  return program
}
