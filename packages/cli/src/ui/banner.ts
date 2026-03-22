import chalk from 'chalk'
import boxen from 'boxen'
import type { InterviewerGuide } from '@vibe-interviewing/core'

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

/**
 * Display the interviewer guide in a styled box.
 * Shown to the interviewer during `host`, never to the candidate.
 */
export function showInterviewerGuide(guide: InterviewerGuide): void {
  const sections: string[] = []

  sections.push(chalk.bold.magenta('INTERVIEWER GUIDE'))
  sections.push('')
  sections.push(normalizeBriefing(guide.overview))

  if (guide.key_signals.length > 0) {
    sections.push('')
    sections.push(chalk.bold('What to Watch For'))
    for (const signal of guide.key_signals) {
      sections.push(`  ${chalk.bold(signal.signal)}`)
      sections.push(`    ${chalk.green('+')} ${signal.positive}`)
      sections.push(`    ${chalk.red('-')} ${signal.negative}`)
    }
  }

  if (guide.common_pitfalls.length > 0) {
    sections.push('')
    sections.push(chalk.bold('Common Pitfalls'))
    for (const pitfall of guide.common_pitfalls) {
      sections.push(`  ${chalk.yellow('!')} ${pitfall}`)
    }
  }

  if (guide.debrief_questions.length > 0) {
    sections.push('')
    sections.push(chalk.bold('Debrief Questions'))
    for (let i = 0; i < guide.debrief_questions.length; i++) {
      sections.push(`  ${i + 1}. ${guide.debrief_questions[i]}`)
    }
  }

  const box = boxen(sections.join('\n'), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'magenta',
  })
  console.log(box)
}
