import type { Command } from 'commander'
import chalk from 'chalk'
import { resolve, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import {
  loadScenarioConfig,
  isUrl,
  discoverAllScenarios,
  SessionManager,
  detectInstalledTools,
  AIToolNotFoundError,
} from '@vibe-interviewing/core'
import {
  SessionServer,
  uploadSession,
  getWorkerUrl,
  type SessionMetadata,
} from '@vibe-interviewing/core/network'
import { showBanner, showInterviewerGuide } from '../ui/banner.js'
import { createSpinner } from '../ui/spinner.js'
import { selectScenario } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerHostCommand(program: Command): void {
  program
    .command('host [scenario]')
    .description(
      'Host an interview session — prepare a workspace and serve it to a remote candidate',
    )
    .option('-s, --scenario-file <path>', 'Path or URL to a scenario.yaml file')
    .option('-p, --port <port>', 'Port to serve on (LAN mode only, default: random)')
    .option('--local', 'Use LAN mode (direct HTTP) instead of cloud hosting')
    .option('--worker-url <url>', 'Cloud relay URL (default: api.vibe-interviewing.iar.dev)')
    .action(
      async (
        scenarioName: string | undefined,
        options: {
          scenarioFile?: string
          port?: string
          local?: boolean
          workerUrl?: string
        },
      ) => {
        try {
          showBanner()

          // 1. Resolve scenario config
          let config
          if (options.scenarioFile) {
            const source = isUrl(options.scenarioFile)
              ? options.scenarioFile
              : resolve(options.scenarioFile)
            config = await loadScenarioConfig(source)
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

          if (config.interviewer_guide) {
            console.log()
            showInterviewerGuide(config.interviewer_guide)
          }

          if (options.local) {
            // LAN mode — start HTTP server (original behavior)
            await hostLanMode(session, fullConfig, options.port)
          } else {
            // Cloud mode — upload to Cloudflare Worker
            await hostCloudMode(session, fullConfig, options.workerUrl)
          }
        } catch (err) {
          log.handleError(err)
        }
      },
    )
}

/** Host via direct LAN HTTP server (original behavior) */
async function hostLanMode(
  session: { workdir: string; systemPromptPath: string; id: string; scenarioName: string },
  config: {
    name: string
    type: string
    difficulty: string
    estimated_time: string
    briefing: string
    setup: string[]
  },
  portStr?: string,
): Promise<void> {
  const server = new SessionServer()
  const port = portStr ? parseInt(portStr, 10) : undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { code, port: actualPort, host } = await server.start(session as any, config as any, port)

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

  process.on('SIGINT', async () => {
    log.info('\nShutting down server...')
    await server.stop()
    process.exit(0)
  })

  // Keep process alive until Ctrl+C
  await new Promise(() => {
    // intentionally never resolves
  })
}

/** Host via cloud upload to Cloudflare Worker */
async function hostCloudMode(
  session: { workdir: string; systemPromptPath: string; id: string; scenarioName: string },
  config: {
    name: string
    type: string
    difficulty: string
    estimated_time: string
    briefing: string
    setup: string[]
  },
  workerUrlOverride?: string,
): Promise<void> {
  const workerUrl = workerUrlOverride ?? getWorkerUrl()

  const spinner = createSpinner('Uploading to cloud...')
  spinner.start()

  // Create tarball of workspace
  const tarballPath = join(session.workdir, '..', `${session.id}.tar.gz`)
  execSync(`tar czf "${tarballPath}" -C "${session.workdir}" .`, { stdio: 'pipe' })

  const systemPrompt = await readFile(session.systemPromptPath, 'utf-8')

  const metadata: SessionMetadata = {
    scenarioName: config.name,
    type: config.type,
    difficulty: config.difficulty,
    estimatedTime: config.estimated_time,
    briefing: config.briefing,
    setupCommands: config.setup,
  }

  const { code, expiresAt } = await uploadSession(
    workerUrl,
    metadata,
    systemPrompt,
    tarballPath,
    (stage) => {
      spinner.text = stage
    },
  )

  spinner.succeed('Uploaded to cloud')

  const expiresDate = new Date(expiresAt)
  const hoursLeft = Math.round((expiresDate.getTime() - Date.now()) / 3600000)

  console.log()
  console.log(chalk.bold.cyan(`  Session code: ${code}`))
  console.log()
  log.info(`Session expires in ${hoursLeft} hours.`)
  log.info(
    `Give this code to the candidate. They run: ${chalk.bold(`vibe-interviewing join ${code}`)}`,
  )
  console.log()
  log.info(chalk.dim('You can close this terminal — the session is hosted in the cloud.'))
}
