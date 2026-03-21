import type { Command } from 'commander'
import * as log from '../utils/logger.js'

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a scenario from an existing repo with AI-powered bug injection (Phase 2)')
    .option('--import <repo>', 'Repository URL or local path to import')
    .option('--inject-bug <description>', 'Description of the bug to inject')
    .action(async () => {
      log.info('The create command with AI-powered bug injection is coming in a future release.')
      log.info('For now, use `vibe-interviewing init` to set up scenarios manually.')
    })
}
