import type { keyPathStates, translationGaps } from '@linguify/constants'
import type { KeyPath, Locale } from './identifiers'
import type { Values } from './values'

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

/**
 * what a project's key paths must be: in a namespace when it has them, no deeper than its format nests, and
 * where each namespace is a file, a name a file can have
 */
export type KeyRules = {
	namespaced: boolean
	nesting: boolean
	namespaceFiles: boolean
}

/**
 * how a locale's text for a key falls short of the default's
 */
export type TranslationGap = Values<typeof translationGaps>
