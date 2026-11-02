import { sortColumns, sortDirections, viewModes } from '@linguify/constants'
import type { KeyFilter, KeySort } from '@linguify/table'
import type { ViewMode } from '@linguify/types'

/**
 * the editor's handle for this page, taken once — the bridge posts through it, and the panel keeps its state
 * in it
 */
export const vscode = acquireVsCodeApi()

/**
 * what the panel keeps through a reload of its page or of the editor: the project's folder, so the editor
 * can bring the panel back on it, and the view as the person left it
 */
export type PanelState = {
	folder: string
	mode?: ViewMode
	filter?: KeyFilter
	sort?: KeySort | undefined
	scroll?: number
}

/**
 * @param value - anything
 *
 * @returns whether it is a list of strings
 */
const isStrings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every(item => typeof item === 'string')

/**
 * the view as the panel last kept it — each part checked, and left out when it is not what the panel writes
 *
 * @returns the view mode, filter, sort and scroll kept, each when there
 */
export const keptView = (): Omit<Partial<PanelState>, 'folder'> => {
	const state = vscode.getState()
	if (typeof state !== 'object' || state === null) return {}
	const { mode, filter, sort, scroll } = state as Record<string, unknown>
	const kept: Omit<Partial<PanelState>, 'folder'> = {}
	if (Object.values(viewModes).some(name => name === mode)) kept.mode = mode as ViewMode
	if (typeof filter === 'object' && filter !== null) {
		const { search, untranslatedIn, namespaces } = filter as Record<string, unknown>
		if (typeof search === 'string' && isStrings(untranslatedIn) && (namespaces === undefined || isStrings(namespaces)))
			kept.filter = { search, untranslatedIn, namespaces }
	}
	if (typeof sort === 'object' && sort !== null) {
		const { column, direction } = sort as { column?: { by?: unknown; locale?: unknown }; direction?: unknown }
		const directed = Object.values(sortDirections).some(name => name === direction)
		if (directed && column?.by === sortColumns.key) kept.sort = sort as KeySort
		if (directed && column?.by === sortColumns.locale && typeof column.locale === 'string') kept.sort = sort as KeySort
	}
	if (typeof scroll === 'number' && Number.isFinite(scroll) && scroll >= 0) kept.scroll = scroll
	return kept
}

/**
 * keeps part of the view, with the project's folder the page was drawn for
 *
 * @param change - what changed
 */
export const keepView = (change: Omit<Partial<PanelState>, 'folder'>) => {
	const folder = document.body.dataset.folder ?? ''
	vscode.setState({ ...keptView(), ...change, folder } satisfies PanelState)
}
