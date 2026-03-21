import type { Command } from 'commander'
import chalk from 'chalk'
import boxen from 'boxen'
import { createServer, type Server } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { networkInterfaces } from 'node:os'
import { randomBytes } from 'node:crypto'
import { loadScenarioConfig, discoverAllScenarios, createTunnel } from '@vibe-interviewing/core'
import type { TunnelInfo } from '@vibe-interviewing/core'
import { selectScenario } from '../ui/prompts.js'
import { createSpinner } from '../ui/spinner.js'
import * as log from '../utils/logger.js'

const execFileAsync = promisify(execFile)

/**
 * Encode a host:port pair or tunnel URL into a base64url session code for the candidate to use.
 */
function encodeSessionCode(value: string): string {
  return Buffer.from(value).toString('base64url')
}

/**
 * Generate a short human-friendly code (4 alphanumeric uppercase chars).
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = randomBytes(4)
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i]! % chars.length]
  }
  return code
}

/**
 * Get the local network IP address (non-loopback IPv4).
 */
function getLocalIP(): string {
  const interfaces = networkInterfaces()
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
  return '127.0.0.1'
}

/**
 * Create a tarball of the scenario directory (codebase + .vibe/).
 */
async function packageScenario(scenarioPath: string): Promise<string> {
  const tarballPath = join(tmpdir(), `vibe-scenario-${Date.now()}.tar.gz`)
  await execFileAsync('tar', ['-czf', tarballPath, '-C', scenarioPath, '.'])
  return tarballPath
}

export function registerHostCommand(program: Command): void {
  program
    .command('host')
    .description('Host an interview session for a candidate to join')
    .option('-s, --scenario <path>', 'Path to scenario directory')
    .option('--local-only', 'Skip tunnel creation and use local network only')
    .action(async (options: { scenario?: string; localOnly?: boolean }) => {
      try {
        const { showBanner } = await import('../ui/banner.js')
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
            log.info('Or specify a path: vibe-interviewing host --scenario ./my-scenario')
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

        // 2. Package scenario into tarball
        log.info('Packaging scenario...')
        const tarballPath = await packageScenario(scenarioPath)
        const tarballSize = statSync(tarballPath).size
        log.success(`Scenario packaged (${(tarballSize / 1024).toFixed(1)} KB)`)
        console.log()

        // 3. Set up download tracking
        const localIP = getLocalIP()
        const shortCode = generateShortCode()

        let onDownloadComplete: () => void
        const downloadPromise = new Promise<void>((resolve) => {
          onDownloadComplete = resolve
        })

        // 4. Start HTTP server on random port
        const server = await new Promise<Server>((resolve) => {
          const srv = createServer((req, res) => {
            const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

            if (req.method === 'GET' && url.pathname === '/download') {
              const code = url.searchParams.get('code')
              if (code !== shortCode) {
                res.writeHead(403, { 'Content-Type': 'text/plain' })
                res.end('Invalid session code')
                return
              }

              const stat = statSync(tarballPath)
              res.writeHead(200, {
                'Content-Type': 'application/gzip',
                'Content-Length': stat.size,
                'Content-Disposition': 'attachment; filename="scenario.tar.gz"',
              })
              createReadStream(tarballPath).pipe(res)
              res.on('finish', () => {
                onDownloadComplete()
              })
              return
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' })
            res.end('Not found')
          })

          srv.listen(0, () => {
            resolve(srv)
          })
        })

        const address = server.address()
        if (!address || typeof address === 'string') {
          throw new Error('Failed to start server')
        }

        const port = address.port
        const localConnectionCode = encodeSessionCode(`${localIP}:${port}`)
        const fullCode = `VIBE-${shortCode}`

        // 5. Attempt tunnel creation for remote access
        let tunnel: TunnelInfo | undefined
        let tunnelConnectionCode: string | undefined

        if (!options.localOnly) {
          try {
            log.info('Creating tunnel for remote access...')
            tunnel = await createTunnel(port)
            tunnelConnectionCode = encodeSessionCode(tunnel.url)
            log.success(`Tunnel established: ${chalk.dim(tunnel.url)}`)
          } catch (tunnelErr) {
            log.warn(
              `Could not create tunnel: ${tunnelErr instanceof Error ? tunnelErr.message : String(tunnelErr)}`,
            )
            log.warn('Falling back to local-only mode.')
          }
        }

        // Cleanup on exit
        const cleanup = (): void => {
          server.close()
          if (tunnel) {
            tunnel.close().catch(() => {
              // Ignore errors during cleanup
            })
          }
        }
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)

        // 6. Display session info
        const sessionLines = [
          `${chalk.bold.cyan('SESSION HOSTED')}`,
          '',
          `${chalk.bold('Session Code:')}  ${chalk.green.bold(fullCode)}`,
          '',
          `${chalk.bold.underline('Local Network')}`,
          `${chalk.bold('Connection:')}    ${chalk.dim(localConnectionCode)}`,
          `${chalk.dim('Candidate runs:')}`,
          `  ${chalk.cyan(`vibe-interviewing join ${localConnectionCode}`)}`,
        ]

        if (tunnelConnectionCode && tunnel) {
          sessionLines.push(
            '',
            `${chalk.bold.underline('Remote (Tunnel)')}`,
            `${chalk.bold('Connection:')}    ${chalk.dim(tunnelConnectionCode)}`,
            `${chalk.dim('Candidate runs:')}`,
            `  ${chalk.cyan(`vibe-interviewing join ${tunnelConnectionCode}`)}`,
          )
        }

        sessionLines.push(
          '',
          `${chalk.dim(`Scenario: ${config.name}`)}`,
          `${chalk.dim(`Serving on: ${localIP}:${port}`)}`,
        )

        const sessionInfo = boxen(sessionLines.join('\n'), {
          padding: 1,
          margin: { top: 1, bottom: 1, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'green',
        })
        console.log(sessionInfo)

        // 6. Wait for candidate to download
        const spinner = createSpinner('Waiting for candidate to connect...')
        spinner.start()

        await downloadPromise

        spinner.succeed('Candidate connected and downloaded scenario')
        console.log()

        // 7. Ask interviewer if ready to proceed
        const { confirmAction } = await import('../ui/prompts.js')
        const ready = await confirmAction('Ready to watch? The candidate will work in Claude Code.')

        if (!ready) {
          log.info('Session hosted. The candidate has the scenario.')
        } else {
          log.info('Watching session. Press Ctrl+C to end.')
          await new Promise<void>((resolve) => {
            process.on('SIGINT', () => {
              console.log()
              log.info('Session ended by interviewer.')
              resolve()
            })
          })
        }

        // Cleanup
        server.close()
        log.success('Server stopped.')
      } catch (err) {
        log.handleError(err)
      }
    })
}
