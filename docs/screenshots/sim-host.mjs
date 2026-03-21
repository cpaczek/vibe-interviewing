#!/usr/bin/env node
// Simulates the host command — interviewer generating a session code
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

console.log(`${c.dim}$ vibe-interviewing host --scenario debug-node-auth${c.reset}`)
console.log()
console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(
  `${c.blue}ℹ${c.reset} Scenario: ${c.bold}Node Auth Middleware — JWT Bug${c.reset} (debug, medium, ~45m)`,
)
console.log(`${c.green}✔${c.reset} Scenario packaged`)
console.log(`${c.green}✔${c.reset} Session server started`)
console.log()

console.log(
  box(
    `${c.bold}Session Ready${c.reset}\n\nHave your candidate run:\n\n  ${c.cyan}${c.bold}vibe-interviewing join VIBE-7X3K${c.reset}\n\nSession is active on your local network.`,
    'green',
  ),
)

console.log()
console.log(`${c.dim}Waiting for candidate to connect...${c.reset}`)
console.log()
