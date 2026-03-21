import type { Command } from 'commander'
import chalk from 'chalk'
import { get } from 'node:http'
import { createWriteStream, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import {
  loadScenarioConfig,
  createRuntime,
  SessionManager,
  detectInstalledTools,
  AIToolNotFoundError,
} from '@vibe-interviewing/core'
import { showBanner, showBriefing } from '../ui/banner.js'
import { withSpinner } from '../ui/spinner.js'
import { confirmAction, selectAITool } from '../ui/prompts.js'
import * as log from '../utils/logger.js'

const execFileAsync = promisify(execFile)

/**
 * Decode a base64url session code into a base URL for the host server.
 * Supports both tunnel URLs (starting with "http") and host:port format.
 */
function decodeSessionCode(code: string): { baseUrl: string } {
  const decoded = Buffer.from(code, 'base64url').toString()

  // Tunnel URL: decoded value starts with "http"
  if (decoded.startsWith('http')) {
    return { baseUrl: decoded }
  }

  // Legacy host:port format
  const lastColon = decoded.lastIndexOf(':')
  if (lastColon === -1) {
    throw new Error(`Invalid session code: ${code}`)
  }
  const host = decoded.slice(0, lastColon)
  const portStr = decoded.slice(lastColon + 1)
  const port = parseInt(portStr, 10)
  if (isNaN(port)) {
    throw new Error(`Invalid port in session code: ${portStr}`)
  }
  return { baseUrl: `http://${host}:${port}` }
}

/**
 * Download a file from the host server via HTTP.
 */
async function downloadTarball(
  baseUrl: string,
  shortCode: string,
  destPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/download?code=${shortCode}`
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`))
        return
      }
      const file = createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => {
        file.close(() => resolve())
      })
      file.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Extract a tarball to a directory.
 */
async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  await execFileAsync('tar', ['-xzf', tarballPath, '-C', destDir])
}

export function registerJoinCommand(program: Command): void {
  program
    .command('join')
    .description('Join an interview session hosted by an interviewer')
    .argument('<code>', 'Session connection code from the interviewer')
    .option('-t, --tool <name>', 'AI tool to use (claude-code or open-code)')
    .option('-m, --model <model>', 'Model to use')
    .option('--no-web', 'Disable web search/fetch in the AI tool')
    .action(async (code: string, options: { tool?: string; model?: string; web?: boolean }) => {
      try {
        showBanner()

        // 1. Decode session code
        const { baseUrl } = decodeSessionCode(code)

        // 2. Download scenario tarball
        const tempDir = mkdtempSync(join(tmpdir(), 'vibe-join-'))
        const tarballPath = join(tempDir, 'scenario.tar.gz')
        const scenarioDir = join(tempDir, 'scenario')

        await withSpinner('Connected to interviewer session', async () => {
          // Just a brief acknowledgment — actual download is next
        })

        await withSpinner('Downloading scenario...', async () => {
          // Extract the short code from URL params won't work here,
          // so we pass an empty string and the host validates.
          // For MVP, the host accepts the download without code validation
          // when using the connection code directly.
          await downloadTarball(baseUrl, '', tarballPath)
        })

        // 3. Extract tarball
        await execFileAsync('mkdir', ['-p', scenarioDir])
        await extractTarball(tarballPath, scenarioDir)

        // 4. Load scenario config
        const config = await loadScenarioConfig(scenarioDir)

        // 5. Check Docker
        const runtime = createRuntime('docker')
        await withSpinner('Checking Docker...', async () => {
          const result = await runtime.isAvailable()
          if (!result.available) {
            throw new Error(result.reason ?? 'Docker is not available')
          }
        })

        // 6. Detect and select AI tool
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
        } else if (installedTools.length === 1 && installedTools[0]) {
          selectedTool = installedTools[0]
        } else {
          selectedTool = await selectAITool(installedTools)
        }

        // 7. Create session (build Docker, copy files, generate wrappers)
        const manager = new SessionManager(runtime, selectedTool.launcher)

        const session = await withSpinner('Setting up interview environment...', async () => {
          return manager.createSession(config, scenarioDir)
        })

        // 8. Show briefing
        console.log()
        showBriefing(config.name, config.difficulty, config.estimated_time, config.briefing)
        console.log()

        const ready = await confirmAction('Ready to launch?')
        if (!ready) {
          log.info('Session created but not started.')
          log.info(`Run ${chalk.cyan('vibe-interviewing destroy')} to clean up.`)
          return
        }

        // 9. Launch AI tool
        console.log()
        log.info(`Launching ${chalk.bold(selectedTool.launcher.displayName)}...`)
        log.info(chalk.dim('The candidate can now work. Close the AI tool to end the session.'))
        console.log()

        const disallowedTools = options.web === false ? ['WebSearch', 'WebFetch'] : undefined

        const result = await manager.launchAITool(session, config, {
          model: options.model,
          disallowedTools,
        })

        // 10. Session complete
        console.log()
        const elapsed = manager.getElapsedTime(session)
        if (result.exitCode === 0) {
          log.success(`Session complete.${elapsed ? ` Time elapsed: ${chalk.bold(elapsed)}` : ''}`)
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
    })
}
