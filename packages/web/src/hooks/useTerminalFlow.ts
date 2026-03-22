import { useState, useEffect, useCallback, useRef } from 'react'
import type { FlowStep, LinePart } from '../flows/types'

export interface RenderedLine {
  parts: LinePart[]
  id: string
}

export interface SelectState {
  prompt: string
  options: string[]
  highlighted: number
}

export interface ConfirmState {
  prompt: string
}

const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const TYPEWRITER_SPEED = 40
const SPINNER_INTERVAL = 80

export interface TerminalFlowState {
  lines: RenderedLine[]
  currentCommand: string | null
  spinnerText: string | null
  select: SelectState | null
  confirm: ConfirmState | null
  isComplete: boolean
  isIdle: boolean
  onSelectOption: (index: number) => void
  onSelectHighlight: (index: number) => void
  onConfirm: (answer: boolean) => void
  onClickPrompt: () => void
}

export function useTerminalFlow(steps: FlowStep[] | null): TerminalFlowState {
  const [lines, setLines] = useState<RenderedLine[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<
    'idle' | 'typing' | 'spinner' | 'select' | 'confirm' | 'pause' | 'done'
  >('idle')
  const [commandCharIndex, setCommandCharIndex] = useState(0)
  const [spinnerFrame, setSpinnerFrame] = useState(0)
  const [spinnerLabel, setSpinnerLabel] = useState<string | null>(null)
  const [selectHighlight, setSelectHighlight] = useState(0)
  const lineIdCounter = useRef(0)

  const nextId = useCallback(() => {
    lineIdCounter.current += 1
    return `line-${lineIdCounter.current}`
  }, [])

  // Reset when steps change
  useEffect(() => {
    setLines([])
    setStepIndex(0)
    setPhase(steps ? 'idle' : 'idle')
    setCommandCharIndex(0)
    setSpinnerLabel(null)
    setSpinnerFrame(0)
    setSelectHighlight(0)
    lineIdCounter.current = 0
  }, [steps])

  // Process the current step based on phase
  useEffect(() => {
    if (!steps || stepIndex >= steps.length) {
      if (steps && stepIndex >= steps.length) setPhase('done')
      return
    }

    const step = steps[stepIndex]!

    if (phase === 'idle') {
      switch (step.type) {
        case 'output': {
          setLines((l) => [...l, ...step.lines.map((parts) => ({ id: nextId(), parts }))])
          setStepIndex((i) => i + 1)
          return
        }
        case 'pause': {
          setPhase('pause')
          return
        }
        case 'spinner': {
          setPhase('spinner')
          return
        }
        case 'command': {
          // Auto-start the first command, wait for user input on subsequent ones
          if (stepIndex === 0) {
            setPhase('typing')
            setCommandCharIndex(1)
          }
          return
        }
        case 'select': {
          setSelectHighlight(0)
          setPhase('select')
          return
        }
        case 'confirm': {
          setPhase('confirm')
          return
        }
        case 'box': {
          const maxLen = Math.max(
            ...step.lines.map((l) =>
              l.reduce(
                (acc, part) => acc + (typeof part === 'string' ? part.length : part.text.length),
                0,
              ),
            ),
          )
          const width = maxLen + 2
          const r = step.border === 'round'
          const chars = {
            tl: r ? '╭' : '╔',
            tr: r ? '╮' : '╗',
            bl: r ? '╰' : '╚',
            br: r ? '╯' : '╝',
            h: r ? '─' : '═',
            v: r ? '│' : '║',
          }
          const color = step.borderColor ?? 'accent'
          const boxLines: RenderedLine[] = [
            {
              id: nextId(),
              parts: [{ text: `${chars.tl}${chars.h.repeat(width)}${chars.tr}`, color }],
            },
          ]
          for (const line of step.lines) {
            const contentLen = line.reduce(
              (acc, part) => acc + (typeof part === 'string' ? part.length : part.text.length),
              0,
            )
            const padding = ' '.repeat(Math.max(0, width - contentLen - 1))
            boxLines.push({
              id: nextId(),
              parts: [
                { text: `${chars.v} `, color },
                ...line,
                padding,
                { text: chars.v, color },
              ] as LinePart[],
            })
          }
          boxLines.push({
            id: nextId(),
            parts: [{ text: `${chars.bl}${chars.h.repeat(width)}${chars.br}`, color }],
          })
          setLines((l) => [...l, ...boxLines])
          setStepIndex((i) => i + 1)
          return
        }
      }
    }
  }, [steps, stepIndex, phase, nextId])

  // Typewriter effect
  useEffect(() => {
    if (phase !== 'typing' || !steps) return
    const step = steps[stepIndex]
    if (!step || step.type !== 'command') return

    if (commandCharIndex > step.text.length) {
      setLines((l) => [...l, { id: nextId(), parts: [{ text: '$ ', color: 'green' }, step.text] }])
      setCommandCharIndex(0)
      setPhase('idle')
      setStepIndex((i) => i + 1)
      return
    }

    const timer = setTimeout(() => setCommandCharIndex((i) => i + 1), TYPEWRITER_SPEED)
    return () => clearTimeout(timer)
  }, [phase, steps, stepIndex, commandCharIndex, nextId])

  // Spinner
  useEffect(() => {
    if (phase !== 'spinner' || !steps) return
    const step = steps[stepIndex]
    if (!step || step.type !== 'spinner') return

    setSpinnerLabel(step.text)
    setSpinnerFrame(0)

    const spinInterval = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_CHARS.length)
    }, SPINNER_INTERVAL)

    const doneTimer = setTimeout(() => {
      clearInterval(spinInterval)
      setSpinnerLabel(null)
      setLines((l) => [
        ...l,
        {
          id: nextId(),
          parts: [{ text: '✓', color: step.doneColor ?? 'green' }, ` ${step.doneText}`],
        },
      ])
      setPhase('idle')
      setStepIndex((i) => i + 1)
    }, step.duration)

    return () => {
      clearInterval(spinInterval)
      clearTimeout(doneTimer)
    }
  }, [phase, steps, stepIndex, nextId])

  // Pause
  useEffect(() => {
    if (phase !== 'pause' || !steps) return
    const step = steps[stepIndex]
    if (!step || step.type !== 'pause') return

    const timer = setTimeout(() => {
      setPhase('idle')
      setStepIndex((i) => i + 1)
    }, step.duration)
    return () => clearTimeout(timer)
  }, [phase, steps, stepIndex])

  // User actions
  const onClickPrompt = useCallback(() => {
    if (phase !== 'idle' || !steps) return
    const step = steps[stepIndex]
    if (!step || step.type !== 'command') return
    setPhase('typing')
    setCommandCharIndex(1)
  }, [phase, steps, stepIndex])

  const onSelectOption = useCallback(
    (index: number) => {
      if (phase !== 'select' || !steps) return
      const step = steps[stepIndex]
      if (!step || step.type !== 'select') return

      setLines((l) => [
        ...l,
        {
          id: nextId(),
          parts: [
            { text: '?', color: 'accent' },
            ` ${step.prompt} `,
            { text: step.options[index]!, color: 'accent' },
          ],
        },
      ])
      setPhase('idle')
      setStepIndex((i) => i + 1)
    },
    [phase, steps, stepIndex, nextId],
  )

  const onSelectHighlight = useCallback(
    (index: number) => {
      if (phase !== 'select') return
      setSelectHighlight(index)
    },
    [phase],
  )

  const onConfirm = useCallback(
    (answer: boolean) => {
      if (phase !== 'confirm' || !steps) return
      const step = steps[stepIndex]
      if (!step || step.type !== 'confirm') return

      const answerText = answer ? 'Y' : 'n'
      setLines((l) => [
        ...l,
        {
          id: nextId(),
          parts: [
            { text: '?', color: 'accent' },
            ` ${step.prompt} `,
            { text: answerText, color: answer ? 'green' : 'red' },
          ],
        },
      ])
      setPhase('idle')
      setStepIndex((i) => i + 1)
    },
    [phase, steps, stepIndex, nextId],
  )

  // Derived state
  const currentStep = steps && stepIndex < steps.length ? steps[stepIndex]! : null

  const currentCommand =
    phase === 'typing' && currentStep?.type === 'command'
      ? currentStep.text.slice(0, commandCharIndex)
      : null

  const displaySpinner =
    spinnerLabel !== null
      ? `${SPINNER_CHARS[spinnerFrame % SPINNER_CHARS.length]} ${spinnerLabel}`
      : null

  const select: SelectState | null =
    phase === 'select' && currentStep?.type === 'select'
      ? { prompt: currentStep.prompt, options: currentStep.options, highlighted: selectHighlight }
      : null

  const confirm: ConfirmState | null =
    phase === 'confirm' && currentStep?.type === 'confirm' ? { prompt: currentStep.prompt } : null

  const isIdle = phase === 'idle' && currentStep?.type === 'command'

  return {
    lines,
    currentCommand,
    spinnerText: displaySpinner,
    select,
    confirm,
    isComplete: phase === 'done',
    isIdle,
    onSelectOption,
    onSelectHighlight,
    onConfirm,
    onClickPrompt,
  }
}
