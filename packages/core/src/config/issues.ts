import { configLayers, errorCodes } from '@linguify/constants'
import type { ConfigLayer, ErrorDetails } from '@linguify/types'
import type { z } from 'zod'
import { ConfigError } from '../errors'

/**
 * one problem found in a config, with the dotted path to the field — `options.indentation`
 */
export type ConfigIssue = {
	path: string
	message: string

	/**
	 * the layers that supplied the value at `path`, when the config was merged from several
	 */
	layers?: ConfigLayer[]
}

/**
 * how each layer is named in error messages
 */
export const layerNames: Record<ConfigLayer, string> = {
	[configLayers.default]: 'defaults',
	[configLayers.editor]: 'editor settings',
	[configLayers.project]: 'project config',
	[configLayers.flag]: 'command-line flags'
}

/**
 * turns one zod issue into a config issue
 *
 * @param issue - zod's issue
 *
 * @returns its dotted path and message
 */
export const toConfigIssue = (issue: z.core.$ZodIssue): ConfigIssue => ({
	path: issue.path.map(String).join('.'),
	message: issue.message
})

/**
 * builds the error for an invalid config, listing every issue on its own line
 *
 * @param title - what was invalid — `Invalid config`, `Invalid project config`
 * @param issues - every problem found
 * @param details - extra details, such as the layer
 *
 * @returns a `CONFIG_INVALID` error whose `details.issues` holds the issues
 */
export const invalidConfig = (title: string, issues: ConfigIssue[], details: ErrorDetails = {}): ConfigError => {
	const lines = issues.map(issue => {
		const origin =
			issue.layers === undefined ? '' : ` (from ${issue.layers.map(layer => layerNames[layer]).join(', ')})`
		return `  ${issue.path || '(root)'}${origin}: ${issue.message}`
	})
	return new ConfigError([`${title}:`, ...lines].join('\n'), {
		code: errorCodes.configInvalid,
		details: { ...details, issues }
	})
}
