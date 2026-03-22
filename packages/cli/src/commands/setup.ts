import type { Command } from 'commander'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { showBanner } from '../ui/banner.js'
import { confirmAction } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Set up optional tools and integrations')
    .action(async () => {
      try {
        showBanner()

        log.info('Welcome to vibe-interviewing setup!\n')

        // Claude Code skill
        console.log('  The create-scenario skill is a Claude Code slash command (/create-scenario)')
        console.log(
          '  that helps interviewers design custom interview scenarios from any codebase.',
        )
        console.log(
          '  It guides you through choosing a repo, scenario type, and generates a complete',
        )
        console.log('  scenario.yaml with patches, briefing, AI rules, and evaluation criteria.\n')

        const installSkill = await confirmAction('Install the create-scenario Claude Code skill?')

        if (installSkill) {
          await installClaudeCodeSkills()
        } else {
          log.info('Skipped. You can run `vibe-interviewing setup` later to install it.')
        }

        console.log()
        log.success('Setup complete!')
      } catch (err) {
        log.handleError(err)
      }
    })
}

async function installClaudeCodeSkills(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const sourceDir = join(__dirname, '..', '..', 'commands')
  const claudeCommandsDir = join(homedir(), '.claude', 'commands')

  if (!existsSync(sourceDir)) {
    log.warn('Could not find skill files. Try reinstalling vibe-interviewing.')
    return
  }

  await mkdir(claudeCommandsDir, { recursive: true })

  const files = await readdir(sourceDir)
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const file of mdFiles) {
    await copyFile(join(sourceDir, file), join(claudeCommandsDir, file))
  }

  if (mdFiles.length > 0) {
    const skills = mdFiles.map((f) => `/${f.replace('.md', '')}`).join(', ')
    log.success(`Claude Code skill installed: ${skills}`)
    log.info('Open Claude Code in any project and run /create-scenario to get started.')
  }
}
