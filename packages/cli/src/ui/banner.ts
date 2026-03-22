import chalk from 'chalk'
import boxen from 'boxen'

export function showBanner(): void {
  const banner = boxen(
    `${chalk.bold('vibe-interviewing')}\n${chalk.dim('AI-era technical interviews')}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    },
  )
  console.log(banner)
}

/**
 * Normalize briefing text: join lines within paragraphs so the terminal
 * handles wrapping naturally, while preserving paragraph breaks.
 */
function normalizeBriefing(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

export function showBriefing(
  name: string,
  difficulty: string,
  time: string,
  briefing: string,
): void {
  const header = `${chalk.bold(name.toUpperCase())}\n${chalk.dim(`${difficulty} | ~${time}`)}`
  const normalized = normalizeBriefing(briefing)
  const box = boxen(
    `${header}\n\n${normalized}\n\n${chalk.dim('Briefing saved to BRIEFING.md in your workspace.')}`,
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    },
  )
  console.log(box)
}
