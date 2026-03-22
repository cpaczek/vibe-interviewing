import { Command } from 'commander'
import { registerStartCommand } from '../commands/start.js'
import { registerListCommand } from '../commands/list.js'
import { registerValidateCommand } from '../commands/validate.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('vibe-interviewing')
    .description(
      'AI-era technical interviews — evaluate how engineers work with AI, not what they memorize',
    )
    .version('0.1.0')

  registerStartCommand(program)
  registerListCommand(program)
  registerValidateCommand(program)

  return program
}

// Run if executed directly
const program = createProgram()
program.parse()
