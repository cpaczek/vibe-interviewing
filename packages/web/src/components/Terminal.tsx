import { useRef, useEffect, useState, useCallback } from 'react'
import type { FlowStep } from '../flows/types'
import { useTerminalFlow } from '../hooks/useTerminalFlow'
import { TerminalLine } from './TerminalLine'
import { InstallCTA } from './InstallCTA'
import { intervieweeFlow } from '../flows/intervieweeFlow'
import { interviewerFlow } from '../flows/interviewerFlow'

const FLOW_OPTIONS = ['interviewee', 'interviewer'] as const

export function Terminal(): React.JSX.Element {
  const [flow, setFlow] = useState<'interviewer' | 'interviewee' | null>(null)
  const [steps, setSteps] = useState<FlowStep[] | null>(null)
  const [pickerHighlight, setPickerHighlight] = useState(0)

  const {
    lines,
    currentCommand,
    spinnerText,
    select,
    confirm,
    isComplete,
    isIdle,
    onSelectOption,
    onSelectHighlight,
    onConfirm,
    onClickPrompt,
  } = useTerminalFlow(steps)

  const bodyRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, currentCommand, spinnerText, select, confirm])

  // Focus terminal on mount and flow changes
  useEffect(() => {
    terminalRef.current?.focus()
  }, [flow, steps])

  const handleFlowSelect = useCallback((f: 'interviewer' | 'interviewee') => {
    setFlow(f)
    setSteps(f === 'interviewer' ? interviewerFlow : intervieweeFlow)
  }, [])

  const handleReplay = useCallback(() => {
    setFlow(null)
    setSteps(null)
    setPickerHighlight(0)
    setTimeout(() => terminalRef.current?.focus(), 50)
  }, [])

  const isRunning = steps !== null && !isComplete && !isIdle
  const isPicking = !steps

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Flow picker
      if (isPicking) {
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          setPickerHighlight((h) => Math.max(0, h - 1))
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          setPickerHighlight((h) => Math.min(FLOW_OPTIONS.length - 1, h + 1))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const selected = FLOW_OPTIONS[pickerHighlight]!
          handleFlowSelect(selected)
        } else if (e.key === '1') {
          e.preventDefault()
          handleFlowSelect('interviewee')
        } else if (e.key === '2') {
          e.preventDefault()
          handleFlowSelect('interviewer')
        }
        return
      }

      // Idle command prompt — Enter or Space to run
      if (isIdle) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClickPrompt()
        }
        return
      }

      // Select prompt — arrows to navigate, Enter to confirm
      if (select) {
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          onSelectHighlight(Math.max(0, select.highlighted - 1))
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          onSelectHighlight(Math.min(select.options.length - 1, select.highlighted + 1))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onSelectOption(select.highlighted)
        }
        return
      }

      // Confirm prompt — y/n or Enter
      if (confirm) {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          e.preventDefault()
          onConfirm(true)
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          onConfirm(false)
        }
        return
      }

      // Complete — r to replay
      if (isComplete) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault()
          handleReplay()
        }
        return
      }
    },
    [
      isPicking,
      pickerHighlight,
      isIdle,
      select,
      confirm,
      isComplete,
      onClickPrompt,
      onSelectOption,
      onSelectHighlight,
      onConfirm,
      handleFlowSelect,
      handleReplay,
    ],
  )

  return (
    <>
      <div className="terminal" ref={terminalRef} tabIndex={0} onKeyDown={handleKeyDown}>
        <div className="terminal-titlebar">
          <span className="terminal-title">
            {flow ? `vibe-interviewing ${flow === 'interviewer' ? 'host' : 'start'}` : 'bash'}
          </span>
          <span className="terminal-status">
            <span
              className={`terminal-status-dot${isRunning ? '' : ' terminal-status-dot--idle'}`}
            />
            {isRunning ? 'running' : 'ready'}
          </span>
        </div>

        <div className="terminal-body" ref={bodyRef}>
          {/* Previously rendered lines */}
          {lines.map((line) => (
            <TerminalLine key={line.id} parts={line.parts} />
          ))}

          {/* Command being typed */}
          {currentCommand !== null && (
            <div className="terminal-command">
              <span className="terminal-prompt-symbol">$ </span>
              {currentCommand}
              <span className="terminal-cursor" />
            </div>
          )}

          {/* Spinner */}
          {spinnerText && <div className="terminal-spinner">{spinnerText}</div>}

          {/* Interactive select */}
          {select && (
            <div className="terminal-select">
              <div className="terminal-select-prompt">
                <span className="t-accent">? </span>
                {select.prompt}
                <span className="terminal-key-hint"> (↑↓ enter)</span>
              </div>
              {select.options.map((opt, i) => (
                <div
                  key={i}
                  className={`terminal-select-option${i === select.highlighted ? ' terminal-select-option--highlighted' : ''}`}
                  onClick={() => onSelectOption(i)}
                  onMouseEnter={() => onSelectHighlight(i)}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          {/* Interactive confirm */}
          {confirm && (
            <div className="terminal-confirm">
              <span className="t-accent">? </span>
              {confirm.prompt}
              <button
                className="terminal-confirm-btn"
                onClick={() => onConfirm(true)}
                type="button"
              >
                Y
              </button>
              <button
                className="terminal-confirm-btn"
                onClick={() => onConfirm(false)}
                type="button"
              >
                n
              </button>
              <span className="terminal-key-hint"> (y/n)</span>
            </div>
          )}

          {/* Idle: waiting for input to start next command */}
          {isIdle && (
            <div className="terminal-prompt-idle" onClick={onClickPrompt}>
              <span className="terminal-prompt-symbol">$ </span>
              <span className="terminal-cursor" />
              <span className="terminal-hint">press enter</span>
            </div>
          )}

          {/* No flow selected — picker inside terminal */}
          {isPicking && (
            <>
              <div className="terminal-line">
                <span className="t-muted">Welcome to </span>
                <span className="t-accent">vibe-interviewing</span>
                <span className="t-muted">. Pick a role to see how it works:</span>
              </div>
              <div className="terminal-line terminal-line--empty" />
              <div className="terminal-flow-picker">
                <button
                  className={`terminal-flow-option${pickerHighlight === 0 ? ' terminal-flow-option--highlighted' : ''}`}
                  onClick={() => handleFlowSelect('interviewee')}
                  onMouseEnter={() => setPickerHighlight(0)}
                  type="button"
                >
                  I&apos;m taking an interview — show me the candidate flow
                </button>
                <button
                  className={`terminal-flow-option${pickerHighlight === 1 ? ' terminal-flow-option--highlighted' : ''}`}
                  onClick={() => handleFlowSelect('interviewer')}
                  onMouseEnter={() => setPickerHighlight(1)}
                  type="button"
                >
                  I&apos;m hiring — show me the interviewer flow
                </button>
              </div>
              <div className="terminal-line terminal-line--empty" />
              <div className="terminal-line">
                <span className="terminal-key-hint">↑↓ to move, enter to select</span>
              </div>
            </>
          )}

          {/* Complete */}
          {isComplete && (
            <>
              <div className="terminal-line terminal-line--empty" />
              <div className="terminal-line">
                <span className="t-dim">— end of demo — </span>
                <span className="terminal-key-hint">press r to replay</span>
              </div>
            </>
          )}
        </div>
      </div>

      {isComplete && <InstallCTA onReplay={handleReplay} />}
    </>
  )
}
