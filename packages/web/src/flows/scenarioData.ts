import type { FlowStep } from './types'

interface ScenarioGuide {
  overview: string[]
  signals: Array<{ signal: string; positive: string; negative: string }>
}

interface ScenarioDemoData {
  name: string
  difficulty: string
  time: string
  briefingLines: string[]
  taskLine: string
  guide: ScenarioGuide
}

export const scenarioData: ScenarioDemoData[] = [
  {
    name: 'patch-data-loss',
    difficulty: 'hard',
    time: '30-45m',
    briefingLines: [
      "You've joined a team maintaining a popular JSON",
      'data store API. Users are reporting that PATCH',
      'requests are silently dropping fields from their',
      'records. The team suspects a regression was',
      'introduced recently.',
    ],
    taskLine: 'Find and fix the bug. Write tests',
    guide: {
      overview: [
        'Tests systematic debugging and HTTP semantics.',
        'The bug makes PATCH behave like PUT.',
      ],
      signals: [
        {
          signal: 'Reproduces before fixing',
          positive: 'Starts with curl to reproduce',
          negative: 'Jumps straight into code',
        },
        {
          signal: 'Critical evaluation of AI',
          positive: 'Questions AI suggestions',
          negative: 'Accepts first suggestion blindly',
        },
      ],
    },
  },
  {
    name: 'webhook-notifications',
    difficulty: 'hard',
    time: '45-60m',
    briefingLines: [
      'Your team needs webhook support so external',
      'integrations can react to changes in real time.',
      'Build a notification system: clients register',
      'webhooks, and the server notifies them on',
      'create, update, and delete events.',
    ],
    taskLine: 'Build the webhook system. Test with curl',
    guide: {
      overview: [
        'Tests feature design and integration skills.',
        'Key insight: json-server gives CRUD for free.',
      ],
      signals: [
        {
          signal: 'Discovers free CRUD',
          positive: 'Realizes /webhooks works out of the box',
          negative: 'Builds custom CRUD from scratch',
        },
        {
          signal: 'Starts with core functionality',
          positive: 'Gets basic delivery working first',
          negative: 'Over-engineers retries and backoff',
        },
      ],
    },
  },
  {
    name: 'storage-adapter-refactor',
    difficulty: 'medium',
    time: '45-60m',
    briefingLines: [
      'The entire data layer is hardcoded to lowdb.',
      'Your job: refactor so storage is pluggable.',
      'Define a clean interface, wrap lowdb in an',
      'adapter, and create an in-memory adapter to',
      'prove the interface works.',
    ],
    taskLine: 'Refactor the storage layer. Verify with curl',
    guide: {
      overview: [
        'Tests architectural thinking and incremental',
        'refactoring. No single right answer.',
      ],
      signals: [
        {
          signal: 'Identifies coupling first',
          positive: 'Maps all lowdb touch points before coding',
          negative: 'Starts coding without understanding deps',
        },
        {
          signal: 'Refactors incrementally',
          positive: 'One change at a time, verifies after each',
          negative: 'Big-bang rewrite, debugs the result',
        },
      ],
    },
  },
]

/** The scenario select step, pre-highlighted to the given index */
export function selectStep(selectedIndex: number): FlowStep {
  return {
    type: 'select',
    prompt: 'Select a scenario:',
    options: [
      'patch-data-loss        hard   | ~30-45m — PATCH requests silently drop fields',
      'webhook-notifications  hard   | ~45-60m — Build a webhook notification system',
      'storage-adapter-refactor medium | ~45-60m — Refactor tightly-coupled storage layer',
    ],
    selected: selectedIndex,
  }
}
