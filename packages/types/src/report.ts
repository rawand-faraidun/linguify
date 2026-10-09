import type { changeKinds, warningCodes } from '@linguify/constants'
import type { Catalogue, Revision } from './catalogue'
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

/**
 * one file a write plan creates or replaces
 */
export type PlannedWrite = {
	file: string
	content: string
}

/**
 * every file a change needs written or deleted; `--dry-run` prints it instead of applying it
 */
export type WritePlan = {
	write: PlannedWrite[]
	delete: string[]
}

/**
 * the options every mutation accepts, on top of its own input
 *
 * @note an optional field of any operation input also takes `undefined`: a zod contract's `.optional()`
 * produces it, and every contract in `@linguify/api` must satisfy its input type
 */
export type MutationOptions = {
	/**
	 * compute the plan without writing anything
	 */
	dryRun?: boolean | undefined

	/**
	 * the revision the caller last read; the write is rejected if the files have moved since
	 */
	expectedRevision?: Revision | undefined
}

/**
 * what every mutation returns
 */
export type MutationResult = {
	report: Report
	plan: WritePlan

	/**
	 * the revision after the write, or the unchanged one under `dryRun`
	 */
	revision: Revision

	/**
	 * whether the plan was carried out — `false` under `dryRun`; an empty plan is carried out by writing
	 * nothing
	 */
	applied: boolean
}
