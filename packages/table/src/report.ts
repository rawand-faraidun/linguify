import {
	actionText,
	changeKinds,
	changeKindText,
	namespaceActions,
	type projectActions,
	projectActionText,
	studioText
} from '@linguify/constants'
import { relativePath } from '@linguify/keys'
import type { ChangeKind, NamespaceName, ProjectAction, Report } from '@linguify/types'
import type { NamespaceAction } from './preflight'
import { countFiles, fill, numbers } from './words'

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

/**
 * @param done - what a write did, in words
 * @param report - what core reported of it
 *
 * @returns the words, then each warning core gave — what it left as it was, and why
 */
export const withWarnings = (done: string, report: Report): string =>
	[done, ...report.warnings.map(warning => warning.message)].join(' ')

/**
 * @param action - what the namespace's dialog did
 * @param name - the name it wrote
 * @param report - what core reported of it
 * @param hidden - whether the view hides the namespace added — a search or the missing filter on
 *
 * @returns what it did, in words, then each warning core gave
 */
export const namespaceWrittenText = (
	action: NamespaceAction,
	name: NamespaceName,
	report: Report,
	hidden: boolean
): string =>
	withWarnings(
		action.kind === namespaceActions.rename
			? fill(studioText.renamedNamespace, { from: action.from, to: name })
			: fill(hidden ? studioText.addedNamespaceHidden : studioText.addedNamespace, { name }),
		report
	)

/**
 * @param preview - an action's outcome
 *
 * @returns how many keys of each kind it changes, in words
 */
export const actionCountsText = (preview: ActionPreview): string[] =>
	preview.counts.map(({ kind, count }) => fill(changeKindText[kind], { count: numbers.format(count) }))

/**
 * @param preview - a dry run's outcome
 *
 * @returns what it would do, in words: the counts, then how many files it writes and removes — the files
 * themselves listed apart
 */
export const actionPlanText = (preview: ActionPreview): string[] => [
	...actionCountsText(preview),
	...(preview.written.length > 0 ? [fill(actionText.writes, { files: countFiles(preview.written.length) })] : []),
	...(preview.removed.length > 0 ? [fill(actionText.removes, { files: countFiles(preview.removed.length) })] : [])
]

/**
 * @param action - a sync, format or import
 * @param done - its run's outcome
 *
 * @returns what it did, in words — the counts, or, when no key changed, how many files
 */
export const actionDoneText = (
	action: Exclude<ProjectAction, typeof projectActions.export>,
	done: ActionPreview
): string => {
	const counts = actionCountsText(done)
	return fill(projectActionText[action].done, {
		summary:
			counts.length > 0 ? counts.join(studioText.listSeparator) : countFiles(done.written.length + done.removed.length)
	})
}
