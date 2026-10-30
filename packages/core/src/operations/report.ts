import type { Catalogue, ChangeKind, KeyPath, Locale, WarningCode } from '@linguify/types'

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

/**
 * what an operation that changes translations returns — it never writes; the caller plans and applies
 */
export type OperationResult = {
	/**
	 * the catalogue after the change; the one passed in is left as it was
	 */
	catalogue: Catalogue
	report: Report
}
