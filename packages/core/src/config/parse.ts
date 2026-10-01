import type { Config } from '@linguify/types'
import { invalidConfig, toConfigIssue } from './issues'
import { configSchema } from './schema'

/**
 * validates one complete config and applies every default, the selected engine's `options` included
 *
 * @note for a config assembled from several sources, use `resolveConfig`, which also reports where
 * each bad value came from
 *
 * @param input - the config as read, of any shape
 *
 * @returns the complete config
 *
 * @throws {@link ConfigError} `CONFIG_INVALID`, listing every problem with its path
 */
export const parseConfig = (input: unknown): Config => {
	const result = configSchema.safeParse(input)
	if (!result.success) throw invalidConfig('Invalid config', result.error.issues.map(toConfigIssue))
	return result.data
}
