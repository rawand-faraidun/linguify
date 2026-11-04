import type { errorCodes } from '@linguify/constants'
import { LinguifyError } from './linguify-error'

/**
 * the codes a {@link ConfigError} carries
 */
export type ConfigErrorCode =
	| typeof errorCodes.configNotFound
	| typeof errorCodes.configInvalid
	| typeof errorCodes.configExists

/**
 * the config file is missing, invalid, or already there when `init` would create it
 */
export class ConfigError extends LinguifyError<ConfigErrorCode> {
	override name = 'ConfigError'
}
