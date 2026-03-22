import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Returns the absolute path to this scenarios package directory */
export function getScenariosDir() {
  return dirname(fileURLToPath(import.meta.url))
}
