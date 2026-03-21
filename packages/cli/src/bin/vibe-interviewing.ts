import { Command } from 'commander'
import { registerStartCommand } from '../commands/start.js'
import { registerListCommand } from '../commands/list.js'
import { registerDestroyCommand } from '../commands/destroy.js'
import { registerValidateCommand } from '../commands/validate.js'
import { registerPreviewCommand } from '../commands/preview.js'
import { registerInitCommand } from '../commands/init.js'
import { registerTestCommand } from '../commands/test.js'
import { registerCreateCommand } from '../commands/create.js'
import { registerHostCommand } from '../commands/host.js'
import { registerJoinCommand } from '../commands/join.js'
import { registerReplayCommand } from '../commands/replay.js'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('vibe-interviewing')
    .description(
      'AI-era technical interviews — evaluate how engineers work with AI, not what they memorize',
    )
    .version('0.1.0')

  registerStartCommand(program)
  registerInitCommand(program)
  registerListCommand(program)
  registerDestroyCommand(program)
  registerValidateCommand(program)
  registerPreviewCommand(program)
  registerTestCommand(program)
  registerCreateCommand(program)
  registerHostCommand(program)
  registerJoinCommand(program)
  registerReplayCommand(program)

  return program
}

// Run if executed directly
const program = createProgram()
program.parse()
