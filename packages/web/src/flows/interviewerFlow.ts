import type { FlowStep } from './types'

export const interviewerFlow: FlowStep[] = [
  {
    type: 'command',
    text: 'vibe-interviewing host',
  },
  { type: 'pause', duration: 300 },
  {
    type: 'select',
    prompt: 'Select a scenario:',
    options: [
      'patch-data-loss        hard   | ~30-45m — PATCH requests silently drop fields',
      'webhook-notifications  hard   | ~45-60m — Build a webhook notification system',
      'storage-adapter-refactor medium | ~45-60m — Refactor tightly-coupled storage layer',
    ],
    selected: 0,
  },
  { type: 'pause', duration: 200 },
  {
    type: 'output',
    lines: [
      [
        { text: 'i', color: 'accent' },
        ' Scenario: ',
        { text: 'patch-data-loss', color: 'accent' },
        ' (hard, ~30-45m)',
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
    lines: [[{ text: 'Session code:', color: 'dim' }], [{ text: 'VIBE-A3F92K', color: 'accent' }]],
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
