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

console.log(`${c.dim}$ vibe-interviewing join VIBE-3R8KW1F0NX${c.reset}`)
console.log()

console.log(
  box(
    `${c.bold}vibe-interviewing${c.reset}\n${c.dim}AI-era technical interviews${c.reset}`,
    'cyan',
  ),
)
console.log()
console.log(`${c.green}✔${c.reset} Session downloaded`)
console.log(`${c.green}✔${c.reset} Setup complete`)
console.log()

const briefing = `We've got a P1 from the support team. Multiple customers are
reporting data loss in our product catalog API. They say they'll
update a single field on a product — like changing the price —
and when they fetch it back, all the other fields are gone.

The API is built on json-server. You can start it locally with:

  node --experimental-strip-types src/bin.ts fixtures/db.json

Start by reproducing the issue, then trace through the code to
find the root cause.`

console.log(
  box(
    `${c.bold}PATCH-DATA-LOSS${c.reset}\n${c.dim}hard | ~30-45 min${c.reset}\n\n${briefing}\n\n${c.dim}Briefing saved to BRIEFING.md in your workspace.${c.reset}`,
    'yellow',
  ),
)

console.log()
console.log(
  `${c.green}?${c.reset} Ready to launch Claude Code? ${c.dim}›${c.reset} ${c.cyan}Yes${c.reset}`,
)
console.log()
console.log(`${c.blue}ℹ${c.reset} Launching ${c.bold}Claude Code${c.reset}...`)
console.log(`${c.dim}Exit Claude Code when done. Your time is being tracked.${c.reset}`)
console.log()
