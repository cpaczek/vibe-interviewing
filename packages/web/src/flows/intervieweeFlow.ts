import type { FlowStep } from './types'

export const intervieweeFlow: FlowStep[] = [
  {
    type: 'command',
    text: 'vibe-interviewing start',
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
      [{ text: 'PATCH-DATA-LOSS', color: 'bold' }],
      [{ text: 'hard | ~30-45m', color: 'dim' }],
      [],
      ["You've joined a team maintaining a popular JSON"],
      ['data store API. Users are reporting that PATCH'],
      ['requests are silently dropping fields from their'],
      ['records. The team suspects a regression was'],
      ['introduced recently.'],
      [],
      [{ text: 'Your task:', color: 'bold' }, ' Find and fix the bug. Write tests'],
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
      [{ text: 'i', color: 'accent' }, ' Exit Claude Code when done. Your time is being tracked.'],
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
