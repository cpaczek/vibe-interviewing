import type { Command } from 'commander'
import chalk from 'chalk'
import { resolve } from 'node:path'
import {
  loadScenarioConfig,
  discoverAllScenarios,
  SessionManager,
  detectInstalledTools,
  AIToolNotFoundError,
} from '@vibe-interviewing/core'
import { SessionServer } from '@vibe-interviewing/core/network'
import { showBanner } from '../ui/banner.js'
import { createSpinner } from '../ui/spinner.js'
import { selectScenario } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerHostCommand(program: Command): void {
  program
    .command('host [scenario]')
    .description(
      'Host an interview session — prepare a workspace and serve it to a remote candidate',
    )
    .option('-s, --scenario-file <path>', 'Path to a local scenario.yaml file')
    .option('-p, --port <port>', 'Port to serve on (default: random)')
    .action(
      async (
        scenarioName: string | undefined,
        options: { scenarioFile?: string; port?: string },
      ) => {
        try {
          showBanner()

          // 1. Resolve scenario config
          let config
          if (options.scenarioFile) {
            config = await loadScenarioConfig(resolve(options.scenarioFile))
          } else if (scenarioName) {
            const scenarios = await discoverAllScenarios()
            const found = scenarios.find((s) => s.name === scenarioName)
            if (!found) {
              log.error(`Scenario "${scenarioName}" not found.`)
              log.info('Run `vibe-interviewing list` to see available scenarios.')
              process.exit(1)
            }
            config = found.config
          } else {
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

          // 2. Detect AI tool (needed for SessionManager)
          const tools = await detectInstalledTools()
          if (tools.length === 0) throw new AIToolNotFoundError('claude-code')

          // 3. Create workspace (skip setup — candidate runs setup after download)
          const spinner = createSpinner('Preparing workspace...')
          spinner.start()

          const manager = new SessionManager(tools[0]!.launcher)
          const { session, config: fullConfig } = await manager.createSession(
            config,
            undefined,
            (stage) => {
              spinner.text = stage
            },
            { skipSetup: true },
          )

          spinner.succeed('Workspace ready')

          // 4. Start HTTP server
          const server = new SessionServer()
          const port = options.port ? parseInt(options.port, 10) : undefined
          const { code, port: actualPort, host } = await server.start(session, fullConfig, port)

          console.log()
          log.info(`Serving on ${chalk.dim(`${host}:${actualPort}`)}`)
          console.log()
          console.log(chalk.bold.cyan(`  Session code: ${code}`))
          console.log()
          log.info(
            `Give this code to the candidate. They run: ${chalk.bold(`vibe-interviewing join ${code}`)}`,
          )
          console.log()
          log.info(chalk.dim('Waiting for candidate to connect... (Ctrl+C to stop)'))

          server.on('candidate-connected', () => {
            log.info('Candidate connected — downloading workspace...')
          })

          server.on('download-complete', () => {
            log.success('Download complete. Candidate is ready.')
            log.info(chalk.dim('You can now close this terminal or press Ctrl+C.'))
          })

          // Keep process alive until Ctrl+C
          process.on('SIGINT', async () => {
            log.info('\nShutting down server...')
            await server.stop()
            process.exit(0)
          })

          // Prevent process from exiting
          await new Promise(() => {
            // intentionally never resolves
          })
        } catch (err) {
          log.handleError(err)
        }
      },
    )
}
