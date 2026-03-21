import type { Command } from 'commander'
import chalk from 'chalk'
import {
  loadScenarioConfig,
  discoverAllScenarios,
  detectInstalledTools,
  createRuntime,
  SessionManager,
  AIToolNotFoundError,
} from '@vibe-interviewing/core'
import { showBanner, showBriefing } from '../ui/banner.js'
import { withSpinner } from '../ui/spinner.js'
import { selectScenario, selectAITool, confirmAction } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start an interview scenario session')
    .option('-s, --scenario <path>', 'Path to scenario directory')
    .option('-t, --tool <name>', 'AI tool to use (claude-code or open-code)')
    .option('-m, --model <model>', 'Model to use')
    .option('--no-web', 'Disable web search/fetch in the AI tool')
    .action(
      async (options: { scenario?: string; tool?: string; model?: string; web?: boolean }) => {
        try {
          showBanner()

          // 1. Select scenario
          let scenarioPath: string
          let config

          if (options.scenario) {
            scenarioPath = options.scenario
            config = await loadScenarioConfig(scenarioPath)
          } else {
            const scenarios = await discoverAllScenarios()
            if (scenarios.length === 0) {
              log.error('No scenarios found.')
              log.info('Create one with: vibe-interviewing init')
              log.info('Or specify a path: vibe-interviewing start --scenario ./my-scenario')
              process.exit(1)
            }
            const selected = await selectScenario(scenarios)
            scenarioPath = selected.path
            config = selected.config
          }

          log.info(
            `Scenario: ${chalk.bold(config.name)} (${config.type}, ${config.difficulty}, ~${config.estimated_time})`,
          )
          console.log()

          // 2. Detect and select AI tool
          const installedTools = await detectInstalledTools()
          if (installedTools.length === 0) {
            throw new AIToolNotFoundError('claude-code')
          }

          let selectedTool
          if (options.tool) {
            selectedTool = installedTools.find((t) => t.launcher.name === options.tool)
            if (!selectedTool) {
              throw new AIToolNotFoundError(options.tool)
            }
          } else {
            selectedTool = await selectAITool(installedTools)
          }

          // 3. Check Docker
          const runtime = createRuntime('docker')
          await withSpinner('Checking Docker...', async () => {
            const result = await runtime.isAvailable()
            if (!result.available) {
              throw new Error(result.reason ?? 'Docker is not available')
            }
          })

          // 4. Create session (build Docker, copy files, generate wrappers)
          const manager = new SessionManager(runtime, selectedTool.launcher)

          const session = await withSpinner('Setting up interview environment...', async () => {
            return manager.createSession(config, scenarioPath)
          })

          // 5. Show briefing
          console.log()
          showBriefing(config.name, config.difficulty, config.estimated_time, config.briefing)
          console.log()

          const ready = await confirmAction('Ready to launch?')
          if (!ready) {
            log.info('Session created but not started.')
            log.info(`Run ${chalk.cyan('vibe-interviewing destroy')} to clean up.`)
            return
          }

          // 6. Launch AI tool
          console.log()
          log.info(`Launching ${chalk.bold(selectedTool.launcher.displayName)}...`)
          log.info(chalk.dim('The candidate can now work. Close the AI tool to end the session.'))
          console.log()

          const disallowedTools = options.web === false ? ['WebSearch', 'WebFetch'] : undefined

          const result = await manager.launchAITool(session, config, {
            model: options.model,
            disallowedTools,
          })

          // 7. Session complete
          console.log()
          const elapsed = manager.getElapsedTime(session)
          if (result.exitCode === 0) {
            log.success(
              `Session complete.${elapsed ? ` Time elapsed: ${chalk.bold(elapsed)}` : ''}`,
            )
          } else {
            log.warn(
              `AI tool exited with code ${result.exitCode}.${elapsed ? ` Time elapsed: ${elapsed}` : ''}`,
            )
          }

          console.log()
          const shouldDestroy = await confirmAction('Destroy the environment?')
          if (shouldDestroy) {
            await withSpinner('Cleaning up...', async () => {
              await manager.destroySession(session)
            })
            log.success('Environment destroyed.')
          } else {
            log.info(`Session ${chalk.dim(session.id)} is still running.`)
            log.info(`Run ${chalk.cyan('vibe-interviewing destroy')} to clean up later.`)
          }
        } catch (err) {
          log.handleError(err)
        }
      },
    )
}
