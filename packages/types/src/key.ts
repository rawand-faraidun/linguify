import type { keyPathStates } from '@linguify/constants'
import type { KeyPath, Locale } from './identifiers'
import type { Values } from './values'

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

/**
 * what a key path points at in one locale's tree
 */
export type KeyPathState = Values<typeof keyPathStates>

/**
 * the result of inspecting one key path in one tree; only `blocked` carries a path
 */
export type KeyPathInspection =
	| { state: Exclude<KeyPathState, 'blocked'> }
	| {
			state: Extract<KeyPathState, 'blocked'>

			/**
			 * the translation's path that blocks the key
			 */
			at: KeyPath
	  }

/**
 * a locale where a translation cannot be written at a path without losing or breaking something
 */
export type KeyConflict = {
	locale: Locale
	state: Extract<KeyPathState, 'group' | 'blocked'>

	/**
	 * the path in the way — the key itself for a group, the blocking translation otherwise
	 */
	at: KeyPath
}
