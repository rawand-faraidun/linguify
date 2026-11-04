import type { KeyPath, Locale } from './identifiers'

/**
 * a translation, or a group of nested keys
 */
export type TranslationNode = string | TranslationTree

/**
 * one locale's keys as nested objects, in file order
 *
 * @note key order is meaningful: `sync` appends and only `format` sorts, so every transformation
 * must preserve insertion order
 */
export type TranslationTree = { [segment: string]: TranslationNode }

/**
 * one locale's keys as full dotted paths
 */
export type FlatTranslations = Record<KeyPath, string>

/**
 * explanatory text per key, from the descriptions file
 */
export type Descriptions = Record<KeyPath, string>

/**
 * everything linguify read from disk: every configured locale's tree, plus the descriptions
 */
export type Catalogue = {
	/**
	 * every configured locale, in config order
	 */
	locales: Record<Locale, TranslationTree>
	descriptions: Descriptions
}

/**
 * a hash of the files a catalogue was read from; a write carrying an older one is rejected
 */
export type Revision = string

/**
 * one key across every locale — a row of `list keys`, of the studio table, and of an export
 */
export type KeyRow = {
	key: KeyPath

	/**
	 * the key's description, when descriptions are on and it has one
	 */
	description?: string

	/**
	 * the key's text per locale, the default locale first; a locale without the key is left out,
	 * which `diff` calls missing
	 */
	values: Record<Locale, string>
}
