import type { Command } from 'commander'
import { select } from '@inquirer/prompts'
import { listActiveSessions, createRuntime, deleteSession } from '@vibe-interviewing/core'
import { withSpinner } from '../ui/spinner.js'
import * as log from '../utils/logger.js'

export function registerDestroyCommand(program: Command): void {
  program
    .command('destroy')
    .description('Tear down an active interview session')
    .argument('[session-id]', 'Session ID to destroy')
    .option('--all', 'Destroy all active sessions')
    .action(async (sessionId: string | undefined, options: { all?: boolean }) => {
      try {
        const sessions = await listActiveSessions()

        if (sessions.length === 0) {
          log.info('No active sessions to destroy.')
          return
        }

        const runtime = createRuntime('docker')

        if (options.all) {
          await withSpinner(`Destroying ${sessions.length} session(s)...`, async () => {
            for (const session of sessions) {
              await runtime.destroy({
                ...session,
                ports: session.ports ?? {},
                createdAt: session.createdAt,
              })
              await deleteSession(session.id)
            }
          })
          log.success('All sessions destroyed.')
          return
        }

        let targetId = sessionId
        if (!targetId) {
          const selected = await select({
            message: 'Which session to destroy?',
            choices: sessions.map((s) => ({
              name: `${s.scenarioName} (${s.id.slice(0, 8)}, started ${getTimeAgo(s.createdAt)})`,
              value: s.id,
            })),
          })
          targetId = selected
        }

        const session = sessions.find((s) => s.id === targetId || s.id.startsWith(targetId ?? ''))
        if (!session) {
          log.error(`Session not found: ${targetId}`)
          return
        }

        await withSpinner('Destroying session...', async () => {
          await runtime.destroy({
            ...session,
            ports: session.ports ?? {},
            createdAt: session.createdAt,
          })
          await deleteSession(session.id)
        })

        log.success('Session destroyed.')
      } catch (err) {
        log.handleError(err)
      }
    })
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}
