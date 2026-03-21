import type { Command } from 'commander'
import chalk from 'chalk'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import {
  generateScenario,
  importRepo,
  detectProject,
  validateScenarioOrThrow,
} from '@vibe-interviewing/core'
import { withSpinner } from '../ui/spinner.js'
import * as log from '../utils/logger.js'

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a scenario with AI — analyzes your codebase and generates everything')
    .argument('[path]', 'Path to project directory (default: current directory)')
    .option('--import <repo>', 'Import from a GitHub repo (owner/repo or URL)')
    .option('--inject-bug <description>', 'Create a debug scenario with a specific bug')
    .option('--inject-feature <description>', 'Create a feature scenario with a specific task')
    .option('-d, --difficulty <level>', 'Difficulty: easy, medium, hard', 'medium')
    .option('--time <time>', 'Estimated time (e.g., 45m, 1h)', '45m')
    .action(
      async (
        pathArg: string | undefined,
        options: {
          import?: string
          injectBug?: string
          injectFeature?: string
          difficulty: string
          time: string
        },
      ) => {
        try {
          // Check for API key
          if (!process.env['ANTHROPIC_API_KEY']) {
            log.error('ANTHROPIC_API_KEY environment variable is required.')
            log.info(`Get your API key at: ${chalk.cyan('https://console.anthropic.com/')}`)
            log.info('')
            log.info(`${chalk.bold('Alternative:')} Use the Claude Code skill instead:`)
            log.info(`  1. Open Claude Code in your project directory`)
            log.info(`  2. Run ${chalk.cyan('/create-scenario')}`)
            log.info(`  No API key needed — uses your existing Claude Code auth.`)
            process.exit(1)
          }

          let projectPath = pathArg ? resolve(pathArg) : process.cwd()

          // Import from repo if specified
          if (options.import) {
            projectPath = await withSpinner(
              `Cloning ${chalk.cyan(options.import)}...`,
              async () => {
                return importRepo(options.import!, pathArg ? resolve(pathArg) : undefined)
              },
            )
            log.success(`Cloned to ${chalk.dim(projectPath)}`)
          }

          // Detect project
          const detected = await detectProject(projectPath)
          log.info(
            `Detected: ${chalk.bold(detected.language)} project (${detected.commands.join(', ')})`,
          )

          // Determine scenario type
          let type: 'debug' | 'feature' | 'custom' = 'debug'
          if (options.injectFeature) {
            type = 'feature'
          } else if (options.injectBug) {
            type = 'debug'
          } else {
            // Interactive selection
            const { select } = await import('@inquirer/prompts')
            type = await select({
              message: 'What type of scenario?',
              choices: [
                {
                  value: 'debug' as const,
                  name: 'Debug — inject a subtle bug for the candidate to find',
                },
                {
                  value: 'feature' as const,
                  name: 'Feature — design a feature for the candidate to build',
                },
              ],
            })
          }

          // Get description if not provided
          let description = options.injectBug ?? options.injectFeature
          if (!description) {
            const { input } = await import('@inquirer/prompts')
            description = await input({
              message:
                type === 'debug'
                  ? 'Describe the bug to inject (or leave blank for AI to decide):'
                  : 'Describe the feature to build (or leave blank for AI to decide):',
            })
          }

          // Generate with AI
          console.log()
          const generated = await withSpinner('Generating scenario with AI...', async () => {
            return generateScenario({
              projectPath,
              type,
              bugDescription: type === 'debug' ? description : undefined,
              featureDescription: type === 'feature' ? description : undefined,
              difficulty: options.difficulty as 'easy' | 'medium' | 'hard',
              estimatedTime: options.time,
            })
          })

          // Write .vibe/ files
          const vibeDir = join(projectPath, '.vibe')
          await mkdir(vibeDir, { recursive: true })

          await writeFile(join(vibeDir, 'scenario.yaml'), yamlStringify(generated.config))
          await writeFile(join(vibeDir, 'system-prompt.md'), generated.systemPrompt)
          await writeFile(join(vibeDir, 'solution.md'), generated.solution)
          await writeFile(join(vibeDir, 'evaluation.md'), generated.evaluation)

          if (generated.dockerfile) {
            await writeFile(join(vibeDir, 'Dockerfile'), generated.dockerfile)
          }

          // Apply code modifications (for debug scenarios)
          if (generated.modifications) {
            for (const mod of generated.modifications) {
              const filePath = join(projectPath, mod.file)
              await writeFile(filePath, mod.content)
              log.info(`Modified: ${chalk.dim(mod.file)}`)
            }
          }

          // Validate
          try {
            await validateScenarioOrThrow(projectPath)
            log.success('Scenario validated successfully.')
          } catch {
            log.warn('Scenario has validation warnings — review and fix as needed.')
          }

          console.log()
          log.success(`Scenario ${chalk.bold(generated.config.name)} created!`)
          console.log()
          console.log(chalk.dim('Created:'))
          console.log(chalk.dim('  .vibe/scenario.yaml'))
          console.log(chalk.dim('  .vibe/system-prompt.md'))
          console.log(chalk.dim('  .vibe/solution.md'))
          console.log(chalk.dim('  .vibe/evaluation.md'))
          if (generated.dockerfile) {
            console.log(chalk.dim('  .vibe/Dockerfile'))
          }
          console.log()

          console.log(chalk.bold('Next steps:'))
          console.log(`  1. Review ${chalk.cyan('.vibe/scenario.yaml')} and customize`)
          console.log(
            `  2. Run ${chalk.cyan('vibe-interviewing preview .')} to see what the interviewer sees`,
          )
          console.log(`  3. Run ${chalk.cyan('vibe-interviewing test .')} to dry-run the scenario`)
          console.log(`  4. Run ${chalk.cyan('vibe-interviewing start .')} to launch an interview`)
          console.log()
        } catch (err) {
          log.handleError(err)
        }
      },
    )
}
