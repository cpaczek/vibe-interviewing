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

export function showBriefing(
  name: string,
  difficulty: string,
  time: string,
  briefing: string,
): void {
  const header = `${chalk.bold(`INTERVIEW SCENARIO: ${name}`)}\n${chalk.dim(`Difficulty: ${difficulty} | Time: ~${time}`)}`
  const box = boxen(
    `${header}\n\n${briefing}\n\n${chalk.dim('This briefing is saved in BRIEFING.md')}`,
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    },
  )
  console.log(box)
}
