import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/** How the package was installed */
export type InstallMethod =
  | { manager: 'npm'; global: boolean }
  | { manager: 'pnpm'; global: boolean }
  | { manager: 'yarn'; global: boolean }
  | { manager: 'bun'; global: boolean }
  | { manager: 'npx'; ephemeral: true }
  | { manager: 'unknown' }

/** Info about an available update */
export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  updateCommand: string
}

/**
 * Fetch the latest published version from the npm registry.
 * Returns null on any failure (network, timeout, parse error).
 */
export async function fetchLatestVersion(
  packageName: string,
  timeoutMs = 3000,
): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

/**
 * Detect how vibe-interviewing was installed by inspecting
 * environment variables and process paths.
 */
export function detectInstallMethod(): InstallMethod {
  const userAgent = process.env['npm_config_user_agent'] ?? ''
  const execPath = process.env['_'] ?? ''

  // Check for npx first
  if (
    userAgent.includes('npx') ||
    execPath.includes('npx') ||
    process.env['npm_command'] === 'exec'
  ) {
    return { manager: 'npx', ephemeral: true }
  }

  // Parse npm_config_user_agent (format: "npm/10.2.0 node/v20.0.0 ...")
  const agentMatch = userAgent.match(/^(npm|pnpm|yarn|bun)\//)
  if (agentMatch) {
    const manager = agentMatch[1] as 'npm' | 'pnpm' | 'yarn' | 'bun'
    const isGlobal = detectGlobalInstall()
    return { manager, global: isGlobal }
  }

  // Fallback: check process path for known package managers
  for (const mgr of ['pnpm', 'yarn', 'bun'] as const) {
    if (execPath.includes(mgr)) {
      return { manager: mgr, global: detectGlobalInstall() }
    }
  }

  // Default: assume npm global if in a global node_modules path
  if (detectGlobalInstall()) {
    return { manager: 'npm', global: true }
  }

  return { manager: 'unknown' }
}

/** Check if the package appears to be in a global node_modules directory */
function detectGlobalInstall(): boolean {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    // Global installs typically live in paths like /usr/lib/node_modules or ~/.npm/...
    return (
      __dirname.includes('/lib/node_modules/') ||
      __dirname.includes('\\node_modules\\') ||
      !__dirname.includes('node_modules/.pnpm')
    )
  } catch {
    return true // assume global if we can't tell
  }
}

/** Get the appropriate update command for the detected install method */
export function getUpdateCommand(method: InstallMethod): string {
  switch (method.manager) {
    case 'npm':
      return 'npm install -g vibe-interviewing@latest'
    case 'pnpm':
      return 'pnpm add -g vibe-interviewing@latest'
    case 'yarn':
      return 'yarn global add vibe-interviewing@latest'
    case 'bun':
      return 'bun install -g vibe-interviewing@latest'
    case 'npx':
      return 'npx vibe-interviewing@latest'
    case 'unknown':
      return 'npm install -g vibe-interviewing@latest'
  }
}

/**
 * Compare two semver strings. Returns true if `latest` is newer than `current`.
 * Only handles standard x.y.z versions (no pre-release tags).
 */
export function isNewer(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number)
  const currentParts = current.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] ?? 0
    const c = currentParts[i] ?? 0
    if (l > c) return true
    if (l < c) return false
  }
  return false
}

/**
 * Check if an update is available. Returns update info if a newer
 * version exists, or null if up-to-date or the check fails.
 */
export async function checkForUpdate(
  currentVersion: string,
  timeoutMs = 3000,
): Promise<UpdateInfo | null> {
  const latest = await fetchLatestVersion('vibe-interviewing', timeoutMs)
  if (!latest || !isNewer(latest, currentVersion)) return null

  const method = detectInstallMethod()
  return {
    currentVersion,
    latestVersion: latest,
    updateCommand: getUpdateCommand(method),
  }
}
