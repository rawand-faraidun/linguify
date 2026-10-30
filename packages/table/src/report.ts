import { changeKinds, ioFormats, pathSeparators } from '@linguify/constants'
import type { ChangeKind, IoFormat } from '@linguify/types'

/**
 * how many keys of each kind an operation changed, what a surface says before and after it
 *
 * @param changes - the operation's report's changes
 *
 * @returns each kind that changed something, in a fixed order — added, updated, renamed, removed — with how
 * many keys; nothing when no key changed
 */
export const changeCounts = (changes: readonly { kind: ChangeKind }[]): { kind: ChangeKind; count: number }[] =>
	Object.values(changeKinds)
		.map(kind => ({ kind, count: changes.filter(change => change.kind === kind).length }))
		.filter(({ count }) => count > 0)

/**
 * what a whole-project action would do, from its dry run — or did, from its run
 */
export type ActionPreview = {
	/**
	 * how many keys of each kind it changes
	 */
	counts: { kind: ChangeKind; count: number }[]

	/**
	 * the files it writes, and those it removes, shown from `from`
	 */
	written: string[]
	removed: string[]

	/**
	 * what it says needs a person — always shown, whether or not anything is written
	 */
	warnings: string[]

	/**
	 * whether it would write or remove nothing — then there is nothing to do, though warnings may stand
	 */
	nothing: boolean
}

/**
 * reads a sync's, format's or import's result as a surface shows it
 *
 * @param result - the run's report and plan
 * @param from - the folder its files are shown from
 *
 * @returns the counts, the files, the warnings, and whether there is nothing to do
 */
export const actionPreview = (
	result: {
		report: { changes: readonly { kind: ChangeKind }[]; warnings: readonly { message: string }[] }
		plan: { write: readonly { file: string }[]; delete: readonly string[] }
	},
	from: string
): ActionPreview => {
	const written = result.plan.write.map(({ file }) => relativePath(from, file))
	const removed = result.plan.delete.map(file => relativePath(from, file))
	return {
		counts: changeCounts(result.report.changes),
		written,
		removed,
		warnings: result.report.warnings.map(({ message }) => message),
		nothing: written.length === 0 && removed.length === 0
	}
}

/**
 * a file's path as a person reads it: from a folder when it is inside it, else whole
 *
 * @note inside means a separator straight after the folder — `/project2` is not inside `/project`
 *
 * @param from - the folder
 * @param file - an absolute path
 *
 * @returns the path from the folder, or the path itself
 */
export const relativePath = (from: string, file: string): string => {
	const base = pathSeparators.some(separator => from.endsWith(separator)) ? from.slice(0, -1) : from
	const next = file.charAt(base.length)
	return file.startsWith(base) && pathSeparators.includes(next) ? file.slice(base.length + 1) : file
}

/**
 * @param value - a format's name, as a control reports it or a file's extension gives it
 *
 * @returns whether it is a table format
 */
export const isIoFormat = (value: string | undefined): value is IoFormat =>
	Object.values(ioFormats).some(format => format === value)
