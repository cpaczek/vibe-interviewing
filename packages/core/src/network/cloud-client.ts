import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { VibeError } from '../errors.js'
import type { SessionMetadata } from './server.js'
import type { ProgressCallback } from '../session/manager.js'
import type { DownloadedSession } from './client.js'

/** Default Cloudflare Worker URL */
export const DEFAULT_WORKER_URL = 'https://api.vibe-interviewing.iar.dev'

/** Get the configured worker URL (env override or default) */
export function getWorkerUrl(): string {
  return process.env['VIBE_WORKER_URL'] || DEFAULT_WORKER_URL
}

/** Error for cloud upload/download failures */
export class CloudError extends VibeError {
  constructor(message: string) {
    super(message, 'CLOUD_ERROR', 'Check your network connection and try again')
  }
}

/**
 * Upload a session to the cloud relay.
 *
 * Sends metadata, system prompt, and workspace tarball to the Cloudflare Worker.
 * Returns a session code the candidate can use to download.
 */
export async function uploadSession(
  workerUrl: string,
  metadata: SessionMetadata,
  systemPrompt: string,
  tarballPath: string,
  onProgress?: ProgressCallback,
): Promise<{ code: string; expiresAt: string }> {
  onProgress?.('Reading workspace tarball...')
  const tarballData = await readFile(tarballPath)

  onProgress?.('Uploading to cloud...')
  const formData = new FormData()
  formData.set('metadata', JSON.stringify(metadata))
  formData.set('systemPrompt', systemPrompt)
  formData.set(
    'workspace',
    new Blob([tarballData], { type: 'application/gzip' }),
    'workspace.tar.gz',
  )

  let response: Response
  try {
    response = await fetch(`${workerUrl}/sessions`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    throw new CloudError(
      `Failed to connect to cloud relay at ${workerUrl}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown error')
    throw new CloudError(`Cloud upload failed (${response.status}): ${body}`)
  }

  const result = (await response.json()) as { code: string; expiresAt: string }
  return result
}

/**
 * Download a session from the cloud relay.
 *
 * Fetches metadata, system prompt, and workspace tarball from the Cloudflare Worker.
 */
export async function downloadSessionFromCloud(
  workerUrl: string,
  code: string,
  targetDir?: string,
  onProgress?: ProgressCallback,
): Promise<DownloadedSession> {
  const id = randomBytes(4).toString('hex')

  // Strip VIBE- prefix and lowercase for the API
  let rawCode = code.trim().toUpperCase()
  if (rawCode.startsWith('VIBE-')) {
    rawCode = rawCode.slice(5)
  }
  rawCode = rawCode.toLowerCase()

  // 1. Fetch metadata
  onProgress?.('Connecting to cloud relay...')
  const metadataRes = await cloudFetch(`${workerUrl}/sessions/${rawCode}/metadata`)
  const metadata = (await metadataRes.json()) as SessionMetadata

  // 2. Fetch system prompt
  onProgress?.('Downloading scenario...')
  const promptRes = await cloudFetch(`${workerUrl}/sessions/${rawCode}/system-prompt`)
  const systemPrompt = await promptRes.text()

  // 3. Download workspace tarball
  onProgress?.('Downloading workspace...')
  const workspaceRes = await cloudFetch(`${workerUrl}/sessions/${rawCode}/workspace`)
  const tarball = Buffer.from(await workspaceRes.arrayBuffer())

  // 4. Extract workspace
  onProgress?.('Extracting workspace...')
  const workdir = targetDir ?? join(homedir(), 'vibe-sessions', `${metadata.scenarioName}-${id}`)
  await mkdir(workdir, { recursive: true })

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

/** Fetch from the cloud worker with error handling */
async function cloudFetch(url: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(60000) })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new CloudError('Cloud download timed out')
    }
    throw new CloudError(
      `Failed to connect to cloud relay: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (response.status === 404) {
    throw new CloudError('Session not found or expired')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown error')
    throw new CloudError(`Cloud request failed (${response.status}): ${body}`)
  }

  return response
}
