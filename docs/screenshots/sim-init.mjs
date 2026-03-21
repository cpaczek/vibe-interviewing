#!/usr/bin/env node
// Simulates the init wizard completion
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
}

console.log(`${c.dim}$ cd ~/my-project && vibe-interviewing init${c.reset}`)
console.log()
console.log(`${c.dim}Initializing scenario in: ~/my-project${c.reset}`)
console.log(`${c.green}✔${c.reset} Detected: ${c.bold}Node.js${c.reset} project`)
console.log(`${c.blue}ℹ${c.reset} Found commands: npm, node, npx`)
console.log()
console.log(`${c.green}?${c.reset} Scenario name: ${c.cyan}Fix the Auth Bug${c.reset}`)
console.log(`${c.green}?${c.reset} Type: ${c.cyan}debug${c.reset}`)
console.log(`${c.green}?${c.reset} Difficulty: ${c.cyan}medium${c.reset}`)
console.log(`${c.green}?${c.reset} Estimated time: ${c.cyan}30m${c.reset}`)
console.log(`${c.green}?${c.reset} Briefing: ${c.dim}(opened in editor)${c.reset}`)
console.log(`${c.green}?${c.reset} Solution: ${c.dim}(opened in editor)${c.reset}`)
console.log(
  `${c.green}?${c.reset} AI rules: ${c.cyan}Don't reveal the root cause, Guide with questions${c.reset}`,
)
console.log(`${c.green}?${c.reset} AI knowledge: ${c.dim}(opened in editor)${c.reset}`)
console.log()
console.log(`${c.green}✔${c.reset} Scenario initialized!`)
console.log()
console.log(`${c.dim}Created:${c.reset}`)
console.log(`${c.dim}  .vibe/scenario.yaml${c.reset}`)
console.log(`${c.dim}  .vibe/solution.md${c.reset}`)
console.log(`${c.dim}  .vibe/system-prompt.md${c.reset}`)
console.log(`${c.dim}  .vibe/evaluation.md${c.reset}`)
console.log(`${c.dim}  .vibe/Dockerfile${c.reset}`)
console.log()
console.log(`${c.bold}Next steps:${c.reset}`)
console.log(`  1. Review ${c.cyan}.vibe/scenario.yaml${c.reset} and customize`)
console.log(`  2. Run ${c.cyan}vibe-interviewing validate .${c.reset} to check config`)
console.log(`  3. Run ${c.cyan}vibe-interviewing test .${c.reset} to dry-run`)
console.log(
  `  4. Run ${c.cyan}vibe-interviewing preview .${c.reset} to see what the interviewer sees`,
)
console.log(`  5. Run ${c.cyan}vibe-interviewing start .${c.reset} to launch an interview`)
console.log()
console.log(`${c.green}✔${c.reset} Added ${c.dim}.vibe/${c.reset} to .gitignore`)
console.log()
