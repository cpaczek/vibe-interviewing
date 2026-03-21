import type { Command } from 'commander'
import chalk from 'chalk'
import { loadScenarioConfig, validateScenario, createRuntime } from '@vibe-interviewing/core'
import { withSpinner } from '../ui/spinner.js'
import * as log from '../utils/logger.js'

export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Dry-run a scenario to verify it builds and runs correctly')
    .argument('<path>', 'Path to scenario directory')
    .action(async (scenarioPath: string) => {
      try {
        // 1. Load and validate scenario config
        const config = await withSpinner('Loading scenario config...', async () => {
          return loadScenarioConfig(scenarioPath)
        })

        log.info(`Scenario: ${chalk.bold(config.name)}`)

        const validation = await withSpinner('Validating scenario...', async () => {
          return validateScenario(scenarioPath, config)
        })

        if (!validation.valid) {
          for (const e of validation.errors) {
            log.error(e)
          }
          log.error('Scenario validation failed. Fix errors before testing.')
          process.exit(1)
        }

        for (const w of validation.warnings) {
          log.warn(w)
        }

        // 2. Check Docker availability
        const runtime = createRuntime('docker')
        const availability = await withSpinner('Checking Docker...', async () => {
          return runtime.isAvailable()
        })

        if (!availability.available) {
          log.error(`Docker is not available: ${availability.reason}`)
          process.exit(1)
        }

        // 3. Create environment (builds Docker image, copies files, starts container)
        const session = await withSpinner('Building and starting environment...', async () => {
          const s = await runtime.create(config, scenarioPath)
          await runtime.start(s)
          return s
        })

        // 4. Run test command if available
        const testCommand = config.environment?.setup_commands?.length ? 'npm test' : undefined

        let testExitCode = 0
        if (testCommand) {
          log.info(`Running: ${chalk.dim(testCommand)}`)
          const result = await runtime.exec(session, testCommand)
          testExitCode = result.exitCode

          if (result.stdout) {
            console.log(result.stdout)
          }
          if (result.stderr) {
            console.error(result.stderr)
          }
        }

        // 5. Tear down
        await withSpinner('Tearing down environment...', async () => {
          await runtime.destroy(session)
        })

        // 6. Report result
        console.log()
        if (testExitCode === 0) {
          log.success('Scenario is ready for interviews.')
        } else {
          log.warn(
            `Test command exited with code ${testExitCode}. ` +
              'This may be expected if the scenario has intentionally failing tests.',
          )
        }
      } catch (err) {
        log.handleError(err)
      }
    })
}
