import ora, { type Ora } from 'ora'

/** Create a spinner with consistent styling */
export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' })
}

/** Run an async task with a spinner */
export async function withSpinner<T>(text: string, fn: () => Promise<T>): Promise<T> {
  const spinner = createSpinner(text)
  spinner.start()
  try {
    const result = await fn()
    spinner.succeed()
    return result
  } catch (err) {
    spinner.fail()
    throw err
  }
}
