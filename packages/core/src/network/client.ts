import { get } from 'node:http'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { VibeError } from '../errors.js'
import type { SessionMetadata } from './server.js'
import type { ProgressCallback } from '../session/manager.js'

/** Result of downloading a session from a host */
export interface DownloadedSession {
  /** Path to the extracted workspace */
  workdir: string
  /** Path to the system prompt file */
  systemPromptPath: string
  /** Session metadata from the host */
  metadata: SessionMetadata
  /** Generated session ID */
  id: string
}

/** Error for network/connection failures */
export class NetworkError extends VibeError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 'Check the session code and ensure the host is running')
  }
}

/** Fetch JSON from an HTTP endpoint */
function fetchJson<T>(host: string, port: number, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = get({ hostname: host, port, path, timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new NetworkError(`Server returned ${res.statusCode} for ${path}`))
        return
      }
      let data = ''
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch {
          reject(new NetworkError(`Invalid response from server for ${path}`))
        }
      })
    })
    req.on('error', (err) => reject(new NetworkError(`Connection failed: ${err.message}`)))
    req.on('timeout', () => {
      req.destroy()
      reject(new NetworkError('Connection timed out'))
    })
  })
}

/** Fetch text from an HTTP endpoint */
function fetchText(host: string, port: number, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get({ hostname: host, port, path, timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new NetworkError(`Server returned ${res.statusCode} for ${path}`))
        return
      }
      let data = ''
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      res.on('end', () => resolve(data))
    })
    req.on('error', (err) => reject(new NetworkError(`Connection failed: ${err.message}`)))
    req.on('timeout', () => {
      req.destroy()
      reject(new NetworkError('Connection timed out'))
    })
  })
}

/** Download a binary file from an HTTP endpoint */
function fetchBinary(host: string, port: number, path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = get({ hostname: host, port, path, timeout: 60000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new NetworkError(`Server returned ${res.statusCode} for ${path}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', (err) => reject(new NetworkError(`Download failed: ${err.message}`)))
    req.on('timeout', () => {
      req.destroy()
      reject(new NetworkError('Download timed out'))
    })
  })
}

/**
 * Download a session from a host.
 *
 * Fetches metadata, system prompt, and workspace tarball, then
 * extracts everything to a local directory.
 */
export async function downloadSession(
  host: string,
  port: number,
  targetDir?: string,
  onProgress?: ProgressCallback,
): Promise<DownloadedSession> {
  const id = randomBytes(4).toString('hex')

  // 1. Fetch metadata
  onProgress?.('Connecting to host...')
  const metadata = await fetchJson<SessionMetadata>(host, port, '/metadata')

  // 2. Fetch system prompt
  onProgress?.('Downloading scenario...')
  const systemPrompt = await fetchText(host, port, '/system-prompt')

  // 3. Download workspace tarball
  onProgress?.('Downloading workspace...')
  const tarball = await fetchBinary(host, port, '/workspace')

  // 4. Extract workspace
  onProgress?.('Extracting workspace...')
  const workdir = targetDir ?? join(homedir(), 'vibe-sessions', `${metadata.scenarioName}-${id}`)
  await mkdir(workdir, { recursive: true })

  // Write tarball to temp file, then extract
  const tarballPath = join(workdir, '..', `${id}-download.tar.gz`)
  await writeFile(tarballPath, tarball)
  execSync(`tar xzf "${tarballPath}" -C "${workdir}"`, { stdio: 'pipe' })

  // 5. Write system prompt outside workspace
  const promptDir = join(homedir(), '.vibe-interviewing', 'prompts')
  await mkdir(promptDir, { recursive: true })
  const systemPromptPath = join(promptDir, `${id}.md`)
  await writeFile(systemPromptPath, systemPrompt)

  return { workdir, systemPromptPath, metadata, id }
}
