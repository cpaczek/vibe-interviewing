import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GitCloneError } from '../errors.js'

/**
 * Import a repository by cloning it to a local directory.
 *
 * For commit SHAs, uses a shallow fetch to avoid downloading full history.
 *
 * @param repoUrl - GitHub URL, SSH URL, or owner/repo shorthand
 * @param targetPath - Directory to clone into (defaults to a temp directory)
 * @param ref - Optional branch, tag, or commit to checkout
 * @returns The path to the cloned directory
 */
export async function importRepo(
  repoUrl: string,
  targetPath?: string,
  ref?: string,
): Promise<string> {
  const { simpleGit } = await import('simple-git')

  // Normalize shorthand (owner/repo -> https://github.com/owner/repo)
  const url = normalizeRepoUrl(repoUrl)

  // Clone to target path or temp directory
  const dest = targetPath ?? (await mkdtemp(join(tmpdir(), 'vibe-import-')))

  const git = simpleGit()

  try {
    if (ref && /^[0-9a-f]{7,40}$/i.test(ref)) {
      // Commit SHA — init + shallow fetch to avoid downloading full history
      await git.init([dest])
      const repoGit = simpleGit(dest)
      await repoGit.addRemote('origin', url)
      await repoGit.fetch(['origin', ref, '--depth', '1'])
      await repoGit.checkout(['FETCH_HEAD'])
    } else if (ref) {
      // Branch or tag — shallow clone
      await git.clone(url, dest, ['--depth', '1', '--branch', ref])
    } else {
      await git.clone(url, dest, ['--depth', '1'])
    }
  } catch (err) {
    throw new GitCloneError(url, err instanceof Error ? err.message : String(err))
  }

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
