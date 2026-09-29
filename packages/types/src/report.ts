import type { changeKinds, warningCodes } from '@linguify/constants'
import type { Revision } from './catalogue'
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
	 * the locales the change reached
	 */
	locales: Locale[]
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
 */
export type MutationOptions = {
	/**
	 * compute the plan without writing anything
	 */
	dryRun?: boolean

	/**
	 * the revision the caller last read; the write is rejected if the files have moved since
	 */
	expectedRevision?: Revision
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
	 * whether the plan was written — `false` under `dryRun`
	 */
	applied: boolean
}
