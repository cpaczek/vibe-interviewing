import type { FlowStep, LinePart } from './types'
import { scenarioData, selectStep } from './scenarioData'

/** Generate the interviewee flow for a specific scenario */
export function getIntervieweeFlow(scenarioIndex: number): FlowStep[] {
  const scenario = scenarioData[scenarioIndex] ?? scenarioData[0]!

  return [
    {
      type: 'command',
      text: 'vibe-interviewing start',
    },
    { type: 'pause', duration: 300 },
    selectStep(scenarioIndex),
    { type: 'pause', duration: 200 },
    {
      type: 'output',
      lines: [
        [
          { text: 'i', color: 'accent' },
          ' Scenario: ',
          { text: scenario.name, color: 'accent' },
          ` (${scenario.difficulty}, ~${scenario.time})`,
        ],
      ],
    },
    { type: 'pause', duration: 150 },
    {
      type: 'spinner',
      text: 'Cloning repository...',
      duration: 1400,
      doneText: 'Repository cloned',
      doneColor: 'green',
    },
    {
      type: 'spinner',
      text: 'Injecting scenario...',
      duration: 600,
      doneText: 'Scenario injected',
      doneColor: 'green',
    },
    {
      type: 'spinner',
      text: 'Preparing workspace...',
      duration: 800,
      doneText: 'Workspace ready',
      doneColor: 'green',
    },
    { type: 'pause', duration: 300 },
    {
      type: 'box',
      border: 'round',
      borderColor: 'yellow',
      lines: [
        [{ text: scenario.name.toUpperCase(), color: 'bold' }],
        [{ text: `${scenario.difficulty} | ~${scenario.time}`, color: 'dim' }],
        [],
        ...scenario.briefingLines.map((line): LinePart[] => [line]),
        [],
        [{ text: 'Your task:', color: 'bold' }, ` ${scenario.taskLine}`],
        ['to prove your fix works.'],
        [],
        [{ text: 'Briefing saved to BRIEFING.md', color: 'dim' }],
      ],
    },
    { type: 'pause', duration: 400 },
    {
      type: 'confirm',
      prompt: 'Open workspace in VS Code?',
      answer: 'Y',
    },
    { type: 'pause', duration: 200 },
    {
      type: 'confirm',
      prompt: 'Ready to launch Claude Code?',
      answer: 'Y',
    },
    { type: 'pause', duration: 150 },
    {
      type: 'output',
      lines: [
        [{ text: 'i', color: 'accent' }, ' Launching Claude Code...'],
        [
          { text: 'i', color: 'accent' },
          ' Exit Claude Code when done. Your time is being tracked.',
        ],
      ],
    },
    { type: 'pause', duration: 2000 },
    {
      type: 'output',
      lines: [
        [
          { text: '✓', color: 'green' },
          ' Session complete. Time: ',
          { text: '23m 15s', color: 'accent' },
        ],
      ],
    },
  ]
}

/** Default flow (used for initial render before selection) */
export const intervieweeFlow = getIntervieweeFlow(0)
