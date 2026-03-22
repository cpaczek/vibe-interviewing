#!/usr/bin/env node
// Simulates the host command — interviewer hosting a remote session
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

function box(text, color, pad = 1) {
  const lines = text.split('\n')
  const maxLen = Math.max(...lines.map((l) => stripAnsi(l).length))
  const w = maxLen + pad * 2
  const esc = color === 'cyan' ? c.cyan : color === 'yellow' ? c.yellow : c.green
  const top = `${esc}╭${'─'.repeat(w)}╮${c.reset}`
  const bot = `${esc}╰${'─'.repeat(w)}╯${c.reset}`
  const empty = `${esc}│${' '.repeat(w)}│${c.reset}`
  const content = lines.map((l) => {
    const stripped = stripAnsi(l)
    const padding = w - stripped.length - pad
    return `${esc}│${c.reset}${' '.repeat(pad)}${l}${' '.repeat(Math.max(0, padding))}${esc}│${c.reset}`
  })
  const padLines = []
  for (let i = 0; i < pad; i++) padLines.push(empty)
  return [top, ...padLines, ...content, ...padLines, bot].join('\n')
}

console.log(`${c.dim}$ vibe-interviewing host patch-data-loss${c.reset}`)
console.log()
console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(
  `${c.blue}ℹ${c.reset} Scenario: ${c.bold}patch-data-loss${c.reset} (hard, ~30-45 min)`,
)
console.log(`${c.green}✔${c.reset} Workspace ready`)
console.log(`${c.green}✔${c.reset} Session uploaded to cloud`)
console.log()
console.log(`  ${c.bold}${c.cyan}Session code: VIBE-3R8KW1F0NX${c.reset}`)
console.log()
console.log(
  `${c.blue}ℹ${c.reset} Give this code to the candidate. They run:`,
)
console.log(
  `  ${c.bold}vibe-interviewing join VIBE-3R8KW1F0NX${c.reset}`,
)
console.log()
console.log(`${c.dim}You can close this terminal. The session is stored in the cloud.${c.reset}`)
console.log()
