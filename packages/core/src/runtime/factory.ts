import type { Runtime } from './types.js'
import { DockerRuntime } from './docker.js'

export type RuntimeType = 'docker'

/** Create a runtime instance by type */
export function createRuntime(type: RuntimeType = 'docker'): Runtime {
  switch (type) {
    case 'docker':
      return new DockerRuntime()
    default:
      throw new Error(`Unknown runtime type: ${type}`)
  }
}
