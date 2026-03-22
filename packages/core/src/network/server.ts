import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { networkInterfaces } from 'node:os'
import { EventEmitter } from 'node:events'
import type { Session } from '../session/types.js'
import type { ScenarioConfig } from '../scenario/types.js'
import { encodeSessionCode } from './session-code.js'

/** Metadata served to candidates */
export interface SessionMetadata {
  scenarioName: string
  type: string
  difficulty: string
  estimatedTime: string
  briefing: string
  setupCommands: string[]
}

/** Events emitted by the session server */
export interface SessionServerEvents {
  'candidate-connected': []
  'download-complete': []
}

/** HTTP server that serves a prepared workspace to a remote candidate */
export class SessionServer extends EventEmitter<SessionServerEvents> {
  private server: Server | null = null

  /** Start serving the session workspace */
  async start(
    session: Session,
    config: ScenarioConfig,
    port?: number,
  ): Promise<{ code: string; port: number; host: string }> {
    // Create tarball of the workspace
    const tarball = join(session.workdir, '..', `${session.id}.tar.gz`)
    execSync(`tar czf "${tarball}" -C "${session.workdir}" .`, { stdio: 'pipe' })

    const systemPrompt = await readFile(session.systemPromptPath, 'utf-8')

    const metadata: SessionMetadata = {
      scenarioName: config.name,
      type: config.type,
      difficulty: config.difficulty,
      estimatedTime: config.estimated_time,
      briefing: config.briefing,
      setupCommands: config.setup,
    }

    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') {
        res.writeHead(405)
        res.end()
        return
      }

      switch (req.url) {
        case '/metadata':
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(metadata))
          break

        case '/system-prompt':
          this.emit('candidate-connected')
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end(systemPrompt)
          break

        case '/workspace':
          readFile(tarball)
            .then((data) => {
              res.writeHead(200, {
                'Content-Type': 'application/gzip',
                'Content-Length': data.length,
              })
              res.end(data)
              this.emit('download-complete')
            })
            .catch(() => {
              res.writeHead(500)
              res.end('Failed to read workspace tarball')
            })
          break

        default:
          res.writeHead(404)
          res.end()
      }
    })

    const listenPort = port ?? 0

    return new Promise((resolve, reject) => {
      this.server!.listen(listenPort, () => {
        const addr = this.server!.address()
        if (!addr || typeof addr === 'string') {
          reject(new Error('Failed to get server address'))
          return
        }

        const host = getLanIp()
        const code = encodeSessionCode(host, addr.port)

        resolve({ code, port: addr.port, host })
      })

      this.server!.on('error', reject)
    })
  }

  /** Stop the server and clean up */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })
  }
}

/** Get the first non-internal IPv4 address */
function getLanIp(): string {
  const interfaces = networkInterfaces()
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address
      }
    }
  }
  return '127.0.0.1'
}
