import type { LinePart, StyledText } from '../flows/types'

interface TerminalLineProps {
  parts: LinePart[]
}

const colorClass: Record<NonNullable<StyledText['color']>, string> = {
  accent: 't-accent',
  green: 't-green',
  yellow: 't-yellow',
  red: 't-red',
  dim: 't-dim',
  bold: 't-bold',
  white: 't-white',
  muted: 't-muted',
  magenta: 't-magenta',
}

function renderPart(part: LinePart, index: number): React.JSX.Element {
  if (typeof part === 'string') {
    return <span key={index}>{part}</span>
  }
  return (
    <span key={index} className={part.color ? colorClass[part.color] : undefined}>
      {part.text}
    </span>
  )
}

export function TerminalLine({ parts }: TerminalLineProps): React.JSX.Element {
  const isEmpty = parts.length === 0 || (parts.length === 1 && parts[0] === '')
  return (
    <div className={`terminal-line${isEmpty ? ' terminal-line--empty' : ''}`}>
      {parts.map(renderPart)}
    </div>
  )
}
