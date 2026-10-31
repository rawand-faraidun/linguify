import { changeKinds } from '@linguify/constants'
import { relativePath } from '@linguify/keys'
import type { ChangeKind, Report } from '@linguify/types'

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
	result: { report: Report; plan: { write: readonly { file: string }[]; delete: readonly string[] } },
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
