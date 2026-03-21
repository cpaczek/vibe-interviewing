import type { Command } from 'commander'
import { input, select, editor } from '@inquirer/prompts'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { stringify as stringifyYaml } from 'yaml'
import { detectProject } from '@vibe-interviewing/core'
import * as log from '../utils/logger.js'
import chalk from 'chalk'

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize an interview scenario in your project (creates .vibe/ directory)')
    .argument('[path]', 'Path to project directory (defaults to current directory)')
    .action(async (projectPath?: string) => {
      try {
        const targetPath = resolve(projectPath ?? '.')

        // Check if .vibe already exists
        if (existsSync(join(targetPath, '.vibe'))) {
          log.warn('A .vibe/ directory already exists in this project.')
          log.info('Edit .vibe/scenario.yaml directly, or delete .vibe/ and re-run init.')
          return
        }

        console.log()
        log.info(`Initializing scenario in: ${chalk.dim(targetPath)}`)
        console.log()

        // Auto-detect project
        const detected = await detectProject(targetPath)
        if (detected.language !== 'unknown') {
          log.success(`Detected: ${chalk.bold(detected.language)} project`)
          if (detected.commands.length > 0) {
            log.info(`Commands: ${detected.commands.join(', ')}`)
          }
          if (detected.hasDockerfile) {
            log.info('Found existing Dockerfile')
          }
          console.log()
        }

        // Gather scenario info
        const defaultName = basename(targetPath)
        const name = await input({
          message: 'Scenario name:',
          default: defaultName,
        })

        const type = await select({
          message: 'Scenario type:',
          choices: [
            { name: 'Debug — candidate finds and fixes a bug', value: 'debug' as const },
            { name: 'Feature — candidate implements a new feature', value: 'feature' as const },
            { name: 'Custom — open-ended task', value: 'custom' as const },
          ],
        })

        const difficulty = await select({
          message: 'Difficulty:',
          choices: [
            { name: 'Easy (~20-30 minutes)', value: 'easy' as const },
            { name: 'Medium (~30-45 minutes)', value: 'medium' as const },
            { name: 'Hard (~45-60+ minutes)', value: 'hard' as const },
          ],
        })

        const estimatedTime = await input({
          message: 'Estimated time:',
          default: difficulty === 'easy' ? '25m' : difficulty === 'medium' ? '40m' : '50m',
        })

        const briefingDefault =
          type === 'debug'
            ? `You've been called in to debug an issue with this project.\n\nSome things to try:\n- Run the test suite to see which tests are failing\n- Check the logs for error messages\n- Trace the code flow from the failing test`
            : type === 'feature'
              ? `You've been asked to implement a new feature for this project.\n\nRequirements:\n- [describe the feature]\n- [describe acceptance criteria]\n\nRun the test suite to see pre-written tests for the feature.`
              : 'Describe the task for the candidate here.'

        const briefing = await editor({
          message: 'Briefing — what does the candidate see? (opens editor)',
          default: briefingDefault,
        })

        const solutionDefault =
          type === 'debug'
            ? 'The bug is in [file] at [line]. The root cause is...'
            : 'The expected implementation should...'

        const solution = await editor({
          message: 'Solution — the answer (interviewer reference only, opens editor)',
          default: solutionDefault,
        })

        const aiRules = await input({
          message: 'AI rules — how should the AI behave? (comma-separated)',
          default:
            type === 'debug'
              ? "Don't reveal the root cause, Guide with questions not answers, If stuck 10+ minutes hint about the general area"
              : "Don't implement the feature for them, Guide their approach with questions, Encourage them to run tests frequently",
        })

        const knowledge = await editor({
          message: 'AI knowledge — what does the AI know? (opens editor)',
          default: solution,
        })

        // Create .vibe directory
        const vibeDir = join(targetPath, '.vibe')
        await mkdir(vibeDir, { recursive: true })

        // Build scenario.yaml
        const commands = detected.commands.length > 0 ? detected.commands : ['npm', 'node']
        const scenarioConfig = {
          name,
          version: '1.0.0',
          type,
          difficulty,
          estimated_time: estimatedTime,
          tags: detected.language !== 'unknown' ? [detected.language] : [],
          briefing: briefing.trim(),
          environment: {
            dockerfile: detected.hasDockerfile ? '../Dockerfile' : './Dockerfile',
            ports: detected.ports,
            commands,
            setup_commands:
              detected.language === 'node'
                ? ['npm install']
                : detected.language === 'python'
                  ? ['pip install -r requirements.txt']
                  : [],
          },
          ai_context: {
            role: `You are assisting a candidate in a technical interview. This is a ${type} scenario.`,
            rules: aiRules.split(',').map((r) => r.trim()),
            knowledge: knowledge.trim(),
          },
          evaluation: {
            criteria: [
              'Did they read existing code before making changes?',
              'Did they form a hypothesis before acting?',
              'How effectively did they prompt the AI for help?',
              'Did they verify their solution works?',
            ],
            expected_solution: solution.trim(),
          },
        }

        // Write files
        await writeFile(
          join(vibeDir, 'scenario.yaml'),
          stringifyYaml(scenarioConfig, { lineWidth: 100 }),
        )

        await writeFile(join(vibeDir, 'solution.md'), `# Solution: ${name}\n\n${solution.trim()}\n`)

        await writeFile(
          join(vibeDir, 'system-prompt.md'),
          [
            `# Interview Scenario: ${name}`,
            '',
            '## Your Role',
            scenarioConfig.ai_context.role,
            '',
            '## Rules',
            ...scenarioConfig.ai_context.rules.map((r) => `- ${r}`),
            '',
            '## Knowledge (DO NOT share directly with the candidate)',
            knowledge.trim(),
            '',
          ].join('\n'),
        )

        await writeFile(
          join(vibeDir, 'evaluation.md'),
          [
            `# Evaluation: ${name}`,
            '',
            '## Criteria',
            ...scenarioConfig.evaluation.criteria.map((c) => `- ${c}`),
            '',
            '## Expected Solution',
            solution.trim(),
            '',
          ].join('\n'),
        )

        // Generate Dockerfile if needed
        if (!detected.hasDockerfile && detected.suggestedDockerfile) {
          await writeFile(join(vibeDir, 'Dockerfile'), detected.suggestedDockerfile)
        }

        // Add .vibe/ to .gitignore if not already there
        const gitignorePath = join(targetPath, '.gitignore')
        if (existsSync(gitignorePath)) {
          const { readFile } = await import('node:fs/promises')
          const gitignore = await readFile(gitignorePath, 'utf-8')
          if (!gitignore.includes('.vibe/')) {
            await writeFile(gitignorePath, gitignore.trimEnd() + '\n.vibe/\n')
            log.success('Added .vibe/ to .gitignore')
          }
        }

        console.log()
        log.success('Scenario initialized!')
        console.log()
        console.log(chalk.dim('  Created:'))
        console.log(`    .vibe/scenario.yaml`)
        console.log(`    .vibe/solution.md`)
        console.log(`    .vibe/system-prompt.md`)
        console.log(`    .vibe/evaluation.md`)
        if (!detected.hasDockerfile && detected.suggestedDockerfile) {
          console.log(`    .vibe/Dockerfile`)
        }

        console.log()
        console.log(chalk.bold('  Next steps:'))
        console.log(`    1. Review and edit ${chalk.cyan('.vibe/scenario.yaml')}`)
        console.log(`    2. ${chalk.cyan('vibe-interviewing validate .')}  — check your config`)
        console.log(
          `    3. ${chalk.cyan('vibe-interviewing preview .')}   — see what the interviewer sees`,
        )
        console.log(`    4. ${chalk.cyan('vibe-interviewing test .')}      — dry run with Docker`)
        console.log(`    5. ${chalk.cyan('vibe-interviewing start -s .')}  — run the interview!`)
        console.log()
      } catch (err) {
        log.handleError(err)
      }
    })
}
