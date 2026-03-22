#!/usr/bin/env node
// Simulates the start command — local interview session
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
  const esc = color === 'cyan' ? c.cyan : c.yellow
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

console.log(`${c.dim}$ vibe-interviewing start rate-limiter-boundary${c.reset}`)
console.log()
console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(
  `${c.blue}ℹ${c.reset} Scenario: ${c.bold}rate-limiter-boundary${c.reset} (medium, ~30-45 min)`,
)
console.log(`${c.blue}ℹ${c.reset} Rate limiter allows requests beyond the configured limit`)
console.log()
console.log(`${c.green}✔${c.reset} Workspace ready`)
console.log()

const briefing = `Hey — we've been getting reports that the rate limiter on our
API is letting through one extra request per window. It should
cap at exactly 100 requests per 15-minute window, but users are
consistently hitting 101.

The rate limiter is built on express-rate-limit. Check out the
sliding window logic. Run ${c.cyan}npm test${c.reset} to see the failing test.`

console.log(
  box(
    `${c.bold}RATE-LIMITER-BOUNDARY${c.reset}\n${c.dim}medium | ~30-45 min${c.reset}\n\n${briefing}\n\n${c.dim}Briefing saved to BRIEFING.md in your workspace.${c.reset}`,
    'yellow',
  ),
)

console.log()
console.log(`${c.green}?${c.reset} Ready to launch Claude Code? ${c.dim}›${c.reset} ${c.cyan}Yes${c.reset}`)
console.log()
console.log(`${c.blue}ℹ${c.reset} Launching ${c.bold}Claude Code${c.reset}...`)
console.log(`${c.dim}Exit Claude Code when done. Your time is being tracked.${c.reset}`)
console.log()
