import { styleText } from 'node:util'
import type { MutationResult } from '@linguify/api'
import { changeKinds, cliDryRunNote } from '@linguify/constants'
import type { KeyChange, Report } from '@linguify/core'
import type { ChangeKind } from '@linguify/types'
import type { TextStyle } from './table'
import { columnWidth, dim, padToWidth, printable, shownPath } from './text'

/**
 * how each kind of change is coloured at a terminal
 */
const kindStyles = {
	[changeKinds.added]: 'green',
	[changeKinds.updated]: 'cyan',
	[changeKinds.renamed]: 'blue',
	[changeKinds.removed]: 'red'
} as const satisfies Record<ChangeKind, TextStyle>

/**
 * @param result - what a command that changes translations did, or would do
 * @param cwd - the working folder, which file paths are shown from
 * @param options - `notes`: lines a command adds after the changes — what a dry run assumed;
 * `changesShown`: the changes were already shown, before a confirmation, so only the files follow
 *
 * @returns for a person: each warning, each key changed — its kind, its path, then dimmed the locales it
 * reached and whether its description changed — then each file written or deleted. A dry run says
 * "would write" and closes by saying nothing was written; a run that changed nothing says so
 */
export const renderMutation = (
	{ report, plan, applied }: MutationResult,
	cwd: string,
	options: { notes?: string[]; changesShown?: boolean } = {}
): string => {
	const verb = applied ? { write: 'wrote', delete: 'deleted' } : { write: 'would write', delete: 'would delete' }
	const verbWidth = Math.max(
		...(plan.write.length > 0 ? [columnWidth(verb.write)] : []),
		...(plan.delete.length > 0 ? [columnWidth(verb.delete)] : [])
	)
	const files = [
		...plan.write.map(({ file }) => `${dim(padToWidth(verb.write, verbWidth))}  ${shownPath(cwd, file)}`),
		...plan.delete.map(file => `${dim(padToWidth(verb.delete, verbWidth))}  ${shownPath(cwd, file)}`)
	]
	const closing = applied ? [] : [dim(cliDryRunNote)]
	const notes = (options.notes ?? []).map(note => dim(note))
	const sections = [options.changesShown === true ? [] : [...changeLines(report), ...notes], files, closing].filter(
		section => section.length > 0
	)
	return `${sections.map(section => section.join('\n')).join('\n\n')}\n`
}

/**
 * @param report - what an operation did, or would do
 *
 * @returns each warning and each key changed, one per line, ending in a line break — what a person
 * confirms before a change is made
 */
export const renderChanges = (report: Report): string => `${changeLines(report).join('\n')}\n`

/**
 * @param report - what an operation did, or would do
 *
 * @returns each warning, then each key changed — its kind, its path, the locales it reached — or, when
 * no warning has already said why, that nothing changed
 */
const changeLines = ({ warnings, changes }: Report): string[] => {
	const style = { stream: process.stdout }
	const kindWidth = Math.max(...Object.values(changeKinds).map(columnWidth))
	const places = changes.map(where)
	const placeWidth = Math.max(0, ...places.map(columnWidth))
	return [
		...warnings.map(({ message }) => `${styleText('yellow', 'warning', style)}  ${printable(message)}`),
		...(changes.length === 0
			? warnings.length > 0
				? []
				: [dim('Nothing changed')]
			: changes.map((change, index) => {
					const kind = padToWidth(styleText(kindStyles[change.kind], change.kind, style), kindWidth)
					const reached = [...change.locales, ...(change.description === true ? ['description'] : [])]
					const place = places[index] ?? ''
					return reached.length === 0
						? `${kind}  ${place}`
						: `${kind}  ${padToWidth(place, placeWidth)}  ${dim(reached.join(', '))}`
				}))
	]
}

/**
 * @param change - one key changed
 *
 * @returns its path, written out safely — `from → to` for a rename
 */
const where = ({ path, from }: KeyChange): string =>
	from === undefined ? printable(path) : `${printable(from)} → ${printable(path)}`
