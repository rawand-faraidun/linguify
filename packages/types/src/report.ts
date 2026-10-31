import type { changeKinds, projectActions, warningCodes } from '@linguify/constants'
import type { KeyPath, Locale } from './identifiers'
import type { Values } from './values'

/**
 * what an operation did to a key
 */
export type ChangeKind = Values<typeof changeKinds>

/**
 * a code carried by every warning
 */
export type WarningCode = Values<typeof warningCodes>

/**
 * a whole-project action — sync, format, import, export
 */
export type ProjectAction = Values<typeof projectActions>

/**
 * one key an operation touched
 */
export type KeyChange = {
	kind: ChangeKind
	path: KeyPath

	/**
	 * the old path, for a rename
	 */
	from?: KeyPath

	/**
	 * the locales whose text the change reached, in config order
	 */
	locales: Locale[]

	/**
	 * set when the change also reached the key's description
	 */
	description?: true
}

/**
 * something an operation noticed and stepped over without failing
 */
export type Warning = {
	code: WarningCode
	path?: KeyPath
	message: string
}

/**
 * what an operation did, in terms of keys
 */
export type Report = {
	changes: KeyChange[]
	warnings: Warning[]
}
