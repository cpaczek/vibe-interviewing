#!/usr/bin/env node
// Simulates the preview command — interviewer-only view
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

console.log(`${c.dim}$ vibe-interviewing preview debug-node-auth${c.reset}`)
console.log()

console.log(
  box(
    `${c.bold}Node Auth Middleware — JWT Bug${c.reset}\n${c.dim}debug | medium | ~45m${c.reset}`,
    'cyan',
  ),
)

console.log(`\n${c.bold}Briefing (what the candidate sees):${c.reset}`)
console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
console.log(`You've been called in to debug a production issue with a REST API.
Users are reporting random logouts — especially in the morning.
The API runs at localhost:3000. Run npm test to see test status.`)

console.log(`\n${c.bold}AI System Prompt (hidden from candidate):${c.reset}`)
console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
console.log(`${c.yellow}You are assisting a candidate in a technical interview.
This is a debugging scenario for a Node.js/Express API.

Rules:
- Do NOT reveal the root cause directly
- Guide the candidate with questions, not answers
- If stuck for 10+ minutes, hint about time-dependent behavior
- Encourage reading error messages and writing tests${c.reset}`)

console.log(`\n${c.bold}Solution:${c.reset}`)
console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
console.log(`${c.green}The bug is in src/utils/jwt.js — the verifyToken function uses
HS256 for tokens issued today but RS256 for older tokens (leftover
from a migration). Tokens issued yesterday fail verification today.

Fix: Always use HS256 algorithm in jwt.verify() options.${c.reset}`)

console.log(`\n${c.bold}Evaluation Rubric:${c.reset}`)
console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
console.log(`  - Did they read error logs before jumping to code?
  - Did they form a hypothesis before making changes?
  - Did they write a test to reproduce the bug?
  - How effectively did they prompt the AI for help?
  - Did they understand the root cause or just patch the symptom?
`)
