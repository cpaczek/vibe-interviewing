import type { Command } from 'commander'
import chalk from 'chalk'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  decodeSessionCode,
  InvalidSessionCodeError,
  SessionManager,
  detectInstalledTools,
  AIToolNotFoundError,
  SetupError,
  type DetectedTool,
} from '@vibe-interviewing/core'
import { downloadSession } from '@vibe-interviewing/core/network'
import { showBanner, showBriefing } from '../ui/banner.js'
import { createSpinner } from '../ui/spinner.js'
import { selectAITool, confirmAction } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

export function registerJoinCommand(program: Command): void {
  program
    .command('join <code>')
    .description('Join a hosted interview session using a session code')
    .option('-w, --workdir <path>', 'Custom workspace directory')
    .option('-t, --tool <name>', 'AI tool to use (default: claude-code)')
    .option('-m, --model <model>', 'Model to use')
    .option('--no-web', 'Disable web search/fetch')
    .action(
      async (
        sessionCode: string,
        options: {
          workdir?: string
          tool?: string
          model?: string
          web?: boolean
        },
      ) => {
        try {
          showBanner()

          // 1. Decode session code
          let host: string
          let port: number
          try {
            const decoded = decodeSessionCode(sessionCode)
            host = decoded.host
            port = decoded.port
          } catch (err) {
            if (err instanceof InvalidSessionCodeError) {
              log.error(`Invalid session code: ${sessionCode}`)
              log.info('Session codes look like VIBE-XXXXXXXXXX')
              process.exit(1)
            }
            throw err
          }

          log.info(`Connecting to ${chalk.dim(`${host}:${port}`)}...`)

          // 2. Download session from host
          const spinner = createSpinner('Downloading session...')
          spinner.start()

          const targetDir = options.workdir ? resolve(options.workdir) : undefined
          const downloaded = await downloadSession(host, port, targetDir, (stage) => {
            spinner.text = stage
          })

          spinner.succeed('Session downloaded')

          // 3. Run setup commands
          if (downloaded.metadata.setupCommands.length > 0) {
            const setupSpinner = createSpinner('Running setup...')
            setupSpinner.start()

            for (const cmd of downloaded.metadata.setupCommands) {
              setupSpinner.text = `Running: ${cmd}`
              try {
                execSync(cmd, { cwd: downloaded.workdir, stdio: 'pipe', timeout: 300000 })
              } catch (err) {
                setupSpinner.fail(`Setup failed: ${cmd}`)
                throw new SetupError(cmd, err instanceof Error ? err.message : String(err))
              }
            }

            setupSpinner.succeed('Setup complete')
          }

          // 4. Show briefing
          console.log()
          showBriefing(
            downloaded.metadata.scenarioName,
            downloaded.metadata.difficulty,
            downloaded.metadata.estimatedTime,
            downloaded.metadata.briefing,
          )
          console.log()

          // 5. Detect AI tool
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

          const ready = await confirmAction('Ready to launch Claude Code?')
          if (!ready) {
            log.info(`Workspace saved at: ${chalk.dim(downloaded.workdir)}`)
            return
          }

          // 6. Launch AI tool
          console.log()
          log.info(`Launching ${chalk.bold(selectedTool.launcher.displayName)}...`)
          log.info(chalk.dim('Exit Claude Code when done. Your time is being tracked.'))
          console.log()

          const manager = new SessionManager(selectedTool.launcher)
          const session = {
            id: downloaded.id,
            scenarioName: downloaded.metadata.scenarioName,
            workdir: downloaded.workdir,
            systemPromptPath: downloaded.systemPromptPath,
            status: 'running' as const,
            createdAt: new Date().toISOString(),
          }

          const disallowedTools = options.web === false ? ['WebSearch', 'WebFetch'] : undefined
          const difficulty = (
            ['easy', 'medium', 'hard'].includes(downloaded.metadata.difficulty)
              ? downloaded.metadata.difficulty
              : 'medium'
          ) as 'easy' | 'medium' | 'hard'

          const result = await manager.launchAITool(
            session,
            {
              name: downloaded.metadata.scenarioName,
              description: '',
              difficulty,
              tags: [],
              estimated_time: downloaded.metadata.estimatedTime,
              briefing: downloaded.metadata.briefing,
              repo: '',
              commit: '',
              patch: [],
              setup: downloaded.metadata.setupCommands,
              ai_rules: { role: '', rules: [], knowledge: '' },
              solution: '',
            },
            {
              model: options.model,
              disallowedTools,
            },
          )

          // 7. Done
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
          log.handleError(err)
        }
      },
    )
}
