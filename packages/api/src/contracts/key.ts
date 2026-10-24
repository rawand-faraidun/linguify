import { exampleKeyPath } from '@linguify/constants'
import { z } from 'zod'
import { keyPath, translations } from './shared'

/**
 * `key add`
 */
export const addKeyInput = z.strictObject({
	path: keyPath.describe(
		`Full dotted key path; with namespaces on, its first segment is the namespace — \`${exampleKeyPath}\``
	),
	value: z.string().optional().describe('The default locale\'s text; `""` when left out'),
	translations: translations
		.optional()
		.describe(
			'Text for other locales, by locale code; a locale left out gets `""`, or the default\'s text under `keys.fillWithDefault`'
		),
	description: z.string().optional().describe("What the key is for — the studio's description column"),
	createNamespace: z
		.boolean()
		.optional()
		.describe("Create the key's namespace when it does not exist, instead of failing; overrides `keys.createNamespace`")
})

/**
 * `key set`
 */
export const setKeyInput = z.strictObject({
	path: keyPath.describe('The key to change; it must exist in some locale — `key set` never creates one'),
	value: z.string().optional().describe("The default locale's new text"),
	translations: translations.optional().describe('New text for other locales, by locale code'),
	all: z
		.boolean()
		.optional()
		.describe("Give the default locale's new text to every locale, except those given their own"),
	description: z.string().optional().describe('The new description; `""` removes it')
})

/**
 * `key rename`
 */
export const renameKeyInput = z.strictObject({
	from: keyPath.describe('The key or group to rename'),
	to: keyPath.describe('Its new path — in the same group, keeping its place, or anywhere else')
})

/**
 * `key remove`
 */
export const removeKeysInput = z.strictObject({
	paths: z
		.array(keyPath)
		.min(1)
		.describe('The keys or groups to remove; a path no locale has is a warning, and the rest still go')
})
