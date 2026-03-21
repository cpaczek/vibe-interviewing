import type { Command } from 'commander'
import chalk from 'chalk'
import { SessionRecorder, type SessionEvent } from '@vibe-interviewing/core'
import * as log from '../utils/logger.js'

/** Format a millisecond timestamp as MM:SS.mmm */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = ms % 1000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/** Get a colored label for an event type */
function coloredType(type: SessionEvent['type']): string {
  switch (type) {
    case 'stdout':
      return chalk.green('stdout')
    case 'stderr':
      return chalk.red('stderr')
    case 'command':
      return chalk.cyan('command')
    case 'note':
      return chalk.yellow('note')
  }
}

/** Render events to terminal with timestamps and color */
function renderTerminal(events: ReadonlyArray<SessionEvent>): void {
  for (const event of events) {
    const time = chalk.dim(formatTimestamp(event.timestamp))
    const label = coloredType(event.type)
    const lines = event.data.trimEnd().split('\n')
    for (const line of lines) {
      console.log(`${time} ${label} ${line}`)
    }
  }
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Generate a Markdown report from recorded events */
function renderMarkdown(sessionId: string, events: ReadonlyArray<SessionEvent>): string {
  const lines: string[] = []
  lines.push(`# Session Recording: ${sessionId}`)
  lines.push('')
  lines.push(`**Events:** ${events.length}`)
  if (events.length > 0) {
    const lastEvent = events[events.length - 1]
    if (lastEvent) {
      lines.push(`**Duration:** ${formatTimestamp(lastEvent.timestamp)}`)
    }
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const event of events) {
    const time = formatTimestamp(event.timestamp)
    lines.push(`### \`${time}\` — ${event.type}`)
    lines.push('')
    lines.push('```')
    lines.push(event.data.trimEnd())
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

/** Generate an HTML report with inline CSS from recorded events */
function renderHtml(sessionId: string, events: ReadonlyArray<SessionEvent>): string {
  const typeColors: Record<string, string> = {
    stdout: '#22c55e',
    stderr: '#ef4444',
    command: '#06b6d4',
    note: '#eab308',
  }

  const eventRows = events
    .map((event) => {
      const color = typeColors[event.type] ?? '#888'
      return `<tr>
        <td style="color:#888;white-space:nowrap;vertical-align:top;padding:2px 8px;font-family:monospace">${escapeHtml(formatTimestamp(event.timestamp))}</td>
        <td style="color:${color};white-space:nowrap;vertical-align:top;padding:2px 8px;font-family:monospace;font-weight:bold">${escapeHtml(event.type)}</td>
        <td style="vertical-align:top;padding:2px 8px"><pre style="margin:0;white-space:pre-wrap;font-family:monospace">${escapeHtml(event.data.trimEnd())}</pre></td>
      </tr>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Recording: ${escapeHtml(sessionId)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 20px; }
    h1 { color: #06b6d4; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .meta { color: #888; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; }
    tr { border-bottom: 1px solid #2a2a3e; }
    tr:hover { background: #2a2a3e; }
    pre { font-size: 13px; }
  </style>
</head>
<body>
  <h1>Session Recording: ${escapeHtml(sessionId)}</h1>
  <div class="meta">
    <p>Events: ${events.length}${events.length > 0 && events[events.length - 1] ? ` | Duration: ${formatTimestamp(events[events.length - 1].timestamp)}` : ''}</p>
  </div>
  <table>
    ${eventRows}
  </table>
</body>
</html>`
}

/** Register the replay command on the CLI program */
export function registerReplayCommand(program: Command): void {
  program
    .command('replay <session-id>')
    .description('Replay a recorded interview session')
    .option('--export <format>', 'Export format: markdown or html')
    .action(async (sessionId: string, options: { export?: string }) => {
      try {
        // Check if listing all recordings
        if (sessionId === 'list') {
          const ids = await SessionRecorder.list()
          if (ids.length === 0) {
            log.info('No recordings found.')
            return
          }
          console.log(chalk.bold('\nRecordings:'))
          for (const id of ids) {
            console.log(`  ${chalk.cyan(id)}`)
          }
          console.log()
          return
        }

        const recorder = await SessionRecorder.load(sessionId).catch(() => {
          log.error(`Recording not found: ${sessionId}`)
          log.info('Run `vibe-interviewing replay list` to see available recordings.')
          process.exit(1)
        })

        const events = recorder.getEvents()

        if (options.export === 'markdown') {
          const output = renderMarkdown(sessionId, events)
          process.stdout.write(output)
        } else if (options.export === 'html') {
          const output = renderHtml(sessionId, events)
          process.stdout.write(output)
        } else if (options.export) {
          log.error(`Unknown export format: ${options.export}`)
          log.info('Supported formats: markdown, html')
          process.exit(1)
        } else {
          console.log(chalk.bold(`\nSession Recording: ${sessionId}`))
          console.log(chalk.dim(`Events: ${events.length}`))
          console.log()
          renderTerminal(events)
          console.log()
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}
