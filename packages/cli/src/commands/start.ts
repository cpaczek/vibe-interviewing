import type { Command } from 'commander'
import chalk from 'chalk'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import {
  loadScenarioConfig,
  discoverAllScenarios,
  detectInstalledTools,
  SessionManager,
  AIToolNotFoundError,
  type DetectedTool,
} from '@vibe-interviewing/core'
import { showBanner, showBriefing } from '../ui/banner.js'
import { createSpinner } from '../ui/spinner.js'
import { selectScenario, selectAITool, confirmAction } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerStartCommand(program: Command): void {
  program
    .command('start [scenario]')
    .description('Start an interview — clone a scenario repo and launch Claude Code')
    .option('-s, --scenario-file <path>', 'Path to a local scenario.yaml file')
    .option('-w, --workdir <path>', 'Custom workspace directory for the session')
    .option('-t, --tool <name>', 'AI tool to use (default: claude-code)')
    .option('-m, --model <model>', 'Model to use')
    .option('--no-web', 'Disable web search/fetch')
    .action(
      async (
        scenarioName: string | undefined,
        options: {
          scenarioFile?: string
          workdir?: string
          tool?: string
          model?: string
          web?: boolean
        },
      ) => {
        try {
          showBanner()

          // 1. Resolve scenario config
          let config
          if (options.scenarioFile) {
            config = await loadScenarioConfig(resolve(options.scenarioFile))
          } else if (scenarioName) {
            // Look up by name in registry
            const scenarios = await discoverAllScenarios()
            const found = scenarios.find((s) => s.name === scenarioName)
            if (!found) {
              log.error(`Scenario "${scenarioName}" not found.`)
              log.info('Run `vibe-interviewing list` to see available scenarios.')
              process.exit(1)
            }
            config = found.config
          } else {
            // Interactive selection
            const scenarios = await discoverAllScenarios()
            if (scenarios.length === 0) {
              log.error('No scenarios found.')
              process.exit(1)
            }
            const selected = await selectScenario(scenarios)
            config = selected.config
          }

          log.info(
            `Scenario: ${chalk.bold(config.name)} (${config.difficulty}, ~${config.estimated_time})`,
          )
          log.info(`${config.description}`)
          console.log()

          // 2. Detect AI tool
          const tools = await detectInstalledTools()
          if (tools.length === 0) throw new AIToolNotFoundError('claude-code')

          let selectedTool: DetectedTool
          if (options.tool) {
            const found = tools.find((t) => t.launcher.name === options.tool)
            if (!found) throw new AIToolNotFoundError(options.tool)
            selectedTool = found
          } else if (tools.length === 1) {
            selectedTool = tools[0]!
          } else {
            selectedTool = await selectAITool(tools)
          }

          // 3. Clone and set up with progress updates
          const spinner = createSpinner('Setting up scenario...')
          spinner.start()

          const manager = new SessionManager(selectedTool.launcher)
          const workdir = options.workdir ? resolve(options.workdir) : undefined
          try {
            const { session, config: fullConfig } = await manager.createSession(
              config,
              workdir,
              (stage) => {
                spinner.text = stage
              },
            )

            spinner.succeed('Workspace ready')

            // 4. Show briefing
            console.log()
            showBriefing(
              fullConfig.name,
              fullConfig.difficulty,
              fullConfig.estimated_time,
              fullConfig.briefing,
            )
            console.log()

            const openVscode = await confirmAction('Open workspace in VS Code?')
            if (openVscode) {
              try {
                execSync(`code "${session.workdir}"`, { stdio: 'ignore' })
                log.info('Opened VS Code.')
              } catch {
                log.warn('Could not open VS Code. Is `code` in your PATH?')
              }
            }

            console.log()
            const ready = await confirmAction('Ready to launch Claude Code?')
            if (!ready) {
              log.info(`Workspace saved at: ${chalk.dim(session.workdir)}`)
              return
            }

            // 5. Launch AI tool
            console.log()
            log.info(`Launching ${chalk.bold(selectedTool.launcher.displayName)}...`)
            log.info(chalk.dim('Exit Claude Code when done. Your time is being tracked.'))
            console.log()

            const disallowedTools = options.web === false ? ['WebSearch', 'WebFetch'] : undefined
            const result = await manager.launchAITool(session, fullConfig, {
              model: options.model,
              disallowedTools,
            })

            // 6. Done
            console.log()
            const elapsed = manager.getElapsedTime(session)
            if (result.exitCode === 0) {
              log.success(`Session complete.${elapsed ? ` Time: ${chalk.bold(elapsed)}` : ''}`)
            } else {
              log.warn(
                `AI tool exited with code ${result.exitCode}.${elapsed ? ` Time: ${elapsed}` : ''}`,
              )
            }
            log.info(`Workspace: ${chalk.dim(session.workdir)}`)
          } catch (err) {
            spinner.fail('Setup failed')
            throw err
          }
        } catch (err) {
          log.handleError(err)
        }
      },
    )
}
