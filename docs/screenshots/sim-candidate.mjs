#!/usr/bin/env node
// Simulates the candidate perspective: join → briefing → launch
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

console.log(`${c.dim}$ vibe-interviewing join VIBE-7X3K${c.reset}`)
console.log()

console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(`${c.green}✔${c.reset} Connected to interviewer session`)
console.log(`${c.green}✔${c.reset} Downloading scenario...`)
console.log(`${c.green}✔${c.reset} Checking Docker...`)
console.log(`${c.green}✔${c.reset} Setting up interview environment...`)
console.log()

const briefing = `You've been called in to debug a production issue with a REST API.
Users are reporting random logouts — especially in the morning.
The team suspects it's authentication-related but hasn't been able
to pin it down.

The API runs at localhost:3000.
Run ${c.cyan}npm test${c.reset} to see current test status.
The codebase is a Node.js/Express API with JWT authentication.`

console.log(
  box(
    `${c.bold}INTERVIEW SCENARIO: Node Auth Middleware — JWT Bug${c.reset}\n${c.dim}Difficulty: medium | Time: ~45m${c.reset}\n\n${briefing}\n\n${c.dim}This briefing is saved in BRIEFING.md${c.reset}`,
    'yellow',
  ),
)

console.log()
console.log(`${c.green}?${c.reset} Ready to launch? ${c.dim}›${c.reset} ${c.cyan}Yes${c.reset}`)
console.log()
console.log(`${c.blue}ℹ${c.reset} Launching ${c.bold}Claude Code${c.reset}...`)
console.log(`${c.dim}  The candidate can now work. Close the AI tool to end the session.${c.reset}`)
console.log()
