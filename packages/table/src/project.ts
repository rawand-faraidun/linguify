import type { RowSource } from '@linguify/keys'
import type { KeyRules, Locale } from '@linguify/types'

/**
 * what a surface reads of the resolved config to draw the table and check new keys — as the API's
 * `config.get` gives it
 */
export type TableProject = {
	namespaced: boolean
	namespaceFiles: boolean
	capabilities: { nesting: boolean }
	config: {
		locales: readonly Locale[]
		default: Locale
		description: { enabled: boolean }
		keys: { createNamespace: boolean }
	}
}

/**
 * the rules a new key is checked by: the format's, and whether it may name a namespace not there yet
 */
export type NewKeyRules = KeyRules & { createNamespace: boolean }

/**
 * @param project - the resolved config
 *
 * @returns the locales the table shows, the default, and whether descriptions are on
 */
export const rowSourceOf = (project: TableProject): RowSource => ({
	locales: project.config.locales,
	default: project.config.default,
	descriptions: project.config.description.enabled
})

/**
 * @param project - the resolved config
 *
 * @returns the rules a new key is checked by
 */
export const newKeyRulesOf = (project: TableProject): NewKeyRules => ({
	namespaced: project.namespaced,
	nesting: project.capabilities.nesting,
	namespaceFiles: project.namespaceFiles,
	createNamespace: project.config.keys.createNamespace
})
