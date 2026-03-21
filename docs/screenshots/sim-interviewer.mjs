#!/usr/bin/env node
// Simulates the interviewer list view using raw ANSI codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
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

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

console.log(`${c.dim}$ vibe-interviewing list${c.reset}`)
console.log()
console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(`${c.bold}Available Scenarios:${c.reset}`)
console.log()

const scenarios = [
  {
    name: 'Node Auth Middleware — JWT Bug',
    meta: 'debug | medium | ~45m',
    desc: 'JWT verification uses wrong algorithm for cross-day tokens',
  },
  {
    name: 'FastAPI Rate Limiter — Race Condition',
    meta: 'debug | hard | ~45m',
    desc: 'Redis TOCTOU race condition allows burst traffic through',
  },
  {
    name: 'E-Commerce API — Wishlist Feature',
    meta: 'feature | medium | ~60m',
    desc: 'Build a wishlist plugin with API endpoints and tests',
  },
]
for (const s of scenarios) {
  console.log(`  ${c.cyan}${s.name}${c.reset}${c.dim} [built-in]${c.reset}`)
  console.log(`    ${c.dim}${s.meta}${c.reset}`)
  console.log(`    ${s.desc}`)
  console.log()
}

console.log(`${c.bold}Active Sessions:${c.reset}`)
console.log(`${c.dim}  No active sessions.${c.reset}`)
console.log()
