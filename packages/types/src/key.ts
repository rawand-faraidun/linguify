import type { keyPathStates } from '@linguify/constants'
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
