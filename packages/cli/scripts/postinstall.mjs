#!/usr/bin/env node

import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function installClaudeCodeSkills() {
  const claudeCommandsDir = join(homedir(), '.claude', 'commands')
  const sourceDir = join(__dirname, '..', 'commands')

  // Check if source commands directory exists
  if (!existsSync(sourceDir)) {
    return
  }

  try {
    // Create ~/.claude/commands/ if it doesn't exist
    await mkdir(claudeCommandsDir, { recursive: true })

    // Copy all command files
    const files = await readdir(sourceDir)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    for (const file of mdFiles) {
      const src = join(sourceDir, file)
      const dest = join(claudeCommandsDir, file)
      await copyFile(src, dest)
    }

    if (mdFiles.length > 0) {
      const skills = mdFiles.map((f) => `/${f.replace('.md', '')}`).join(', ')
      console.log(`\n  ✔ Claude Code skills installed: ${skills}`)
      console.log('    Use these slash commands in Claude Code to create interview scenarios.\n')
    }
  } catch {
    // Silently skip if Claude Code isn't set up — not a hard requirement
  }
}

installClaudeCodeSkills()
