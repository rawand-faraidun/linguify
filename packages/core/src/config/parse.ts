import { errorCodes } from '@linguify/constants'
import type { Config } from '@linguify/types'
import { ConfigError } from '../errors'
import { configSchema } from './schema'

/**
 * one problem found in a config, with the dotted path to the field — `options.indentation`
 */
export type ConfigIssue = {
	path: string
	message: string
}

/**
 * validates a config and applies every default, the selected engine's `options` included
 *
 * @param input - the config as read, of any shape
 *
 * @returns the complete config
 *
 * @throws {@link ConfigError} `CONFIG_INVALID`, listing every problem with its path
 */
export const parseConfig = (input: unknown): Config => {
	const result = configSchema.safeParse(input)
	if (result.success) return result.data

	const issues: ConfigIssue[] = result.error.issues.map(issue => ({
		path: issue.path.map(String).join('.'),
		message: issue.message
	}))
	const lines = issues.map(issue => `  ${issue.path || '(root)'}: ${issue.message}`)
	throw new ConfigError(`Invalid config:\n${lines.join('\n')}`, {
		code: errorCodes.configInvalid,
		details: { issues }
	})
}
