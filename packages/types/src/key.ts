import type { KeyPath, Locale } from './identifiers'

/**
 * `key add`'s input
 */
export type AddKeyInput = {
	path: KeyPath

	/**
	 * the default locale's text; `""` when omitted
	 */
	value?: string

	/**
	 * text for other locales; a locale left out gets `""`, or the default locale's text under
	 * `keys.fillWithDefault`
	 */
	translations?: Record<Locale, string>

	description?: string

	/**
	 * create the key's namespace when it does not exist, instead of failing
	 */
	createNamespace?: boolean
}

/**
 * `key set`'s input — changes an existing key and never creates one
 */
export type SetKeyInput = {
	path: KeyPath

	/**
	 * the default locale's new text
	 */
	value?: string

	/**
	 * other locales' new text
	 */
	translations?: Record<Locale, string>

	/**
	 * apply `value` to every locale, not only the default
	 */
	all?: boolean

	description?: string
}

/**
 * `key rename`'s input — moves the key in every locale, description included, across namespaces
 * too
 */
export type RenameKeyInput = {
	from: KeyPath
	to: KeyPath
}

/**
 * `key remove`'s input; a path that does not exist is a warning, not a failure
 */
export type RemoveKeysInput = {
	paths: KeyPath[]
}
