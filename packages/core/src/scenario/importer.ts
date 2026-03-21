import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/** Import a repository by cloning it to a local directory */
export async function importRepo(repoUrl: string, targetPath?: string): Promise<string> {
  const { simpleGit } = await import('simple-git')

  // Normalize shorthand (owner/repo → https://github.com/owner/repo)
  const url = normalizeRepoUrl(repoUrl)

  // Clone to target path or temp directory
  const dest = targetPath ?? (await mkdtemp(join(tmpdir(), 'vibe-import-')))

  const git = simpleGit()
  await git.clone(url, dest, ['--depth', '1'])

  return dest
}

/** Normalize various repo URL formats to full HTTPS URLs */
function normalizeRepoUrl(input: string): string {
  // Already a full URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input
  }

  // Git SSH format
  if (input.startsWith('git@')) {
    return input.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '')
  }

  // Shorthand: owner/repo
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(input)) {
    return `https://github.com/${input}`
  }

  return input
}
