import { CedarJSJobError } from '../../errors.js'

/**
 * Thrown when a given model name isn't actually available in the PrismaClient
 */
export class ModelNameError extends CedarJSJobError {
  constructor(name: string) {
    super(`Model \`${name}\` not found in PrismaClient`)
  }
}
