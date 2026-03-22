import type { FlowStep, LinePart } from './types'
import { scenarioData, selectStep } from './scenarioData'

/** Generate the interviewer flow for a specific scenario */
export function getInterviewerFlow(scenarioIndex: number): FlowStep[] {
  const scenario = scenarioData[scenarioIndex] ?? scenarioData[0]!
  const guide = scenario.guide

  return [
    {
      type: 'command',
      text: 'vibe-interviewing host',
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
      text: 'Preparing workspace...',
      duration: 1000,
      doneText: 'Workspace ready',
      doneColor: 'green',
    },
    { type: 'pause', duration: 200 },
    {
      type: 'box',
      border: 'round',
      borderColor: 'magenta',
      lines: [
        [{ text: 'INTERVIEWER GUIDE', color: 'magenta' }],
        [],
        ...guide.overview.map((line): LinePart[] => [line]),
        [],
        [{ text: 'What to Watch For', color: 'bold' }],
        ...guide.signals.flatMap((s): LinePart[][] => [
          ['  ', { text: s.signal, color: 'bold' }],
          ['    ', { text: '+', color: 'green' }, ` ${s.positive}`],
          ['    ', { text: '-', color: 'red' }, ` ${s.negative}`],
        ]),
      ],
    },
    { type: 'pause', duration: 400 },
    {
      type: 'spinner',
      text: 'Uploading to cloud...',
      duration: 1600,
      doneText: 'Uploaded to cloud',
      doneColor: 'green',
    },
    { type: 'pause', duration: 300 },
    {
      type: 'box',
      border: 'double',
      borderColor: 'accent',
      lines: [
        [{ text: 'Session code:', color: 'dim' }],
        [{ text: 'VIBE-A3F92K', color: 'accent' }],
      ],
    },
    { type: 'pause', duration: 200 },
    {
      type: 'output',
      lines: [
        [{ text: 'i', color: 'accent' }, ' Session expires in 24 hours.'],
        [{ text: 'i', color: 'accent' }, ' Give this code to the candidate. They run:'],
        ['  ', { text: 'vibe-interviewing join VIBE-A3F92K', color: 'bold' }],
        [],
        [
          { text: 'i', color: 'accent' },
          ' You can close this terminal — the session is hosted in the cloud.',
        ],
      ],
    },
  ]
}

/** Default flow (used for initial render before selection) */
export const interviewerFlow = getInterviewerFlow(0)
