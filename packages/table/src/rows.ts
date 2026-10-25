import { rowIdSeparator, rowKinds, viewModes } from '@linguify/constants'
import { joinKeyPath, splitKeyPath, splitNamespace } from '@linguify/keys'
import type { EngineCapabilities, KeyPath, KeyRow, Locale, NamespaceName, ViewMode } from '@linguify/types'

/**
 * a namespace in the table: a collapsible section holding its keys
 */
export type SectionRow = {
	kind: typeof rowKinds.section
	id: string
	namespace: NamespaceName

	/**
	 * how many keys the section holds
	 */
	keys: number
	subRows: TableRow[]
}

/**
 * one key in the table
 */
export type KeyTableRow = {
	kind: typeof rowKinds.key
	id: string
	key: KeyPath

	/**
	 * what the key column shows: the path below its section — `save` under `common` — or the whole path
	 * when there is no section
	 */
	label: string
	description?: string

	/**
	 * the key's text per locale; a locale without the key is left out
	 */
	values: Record<Locale, string>
}

/**
 * a key path segment holding nested keys, in the tree view
 */
export type GroupRow = {
	kind: typeof rowKinds.group
	id: string

	/**
	 * the group's full path — `common.menu`
	 */
	path: KeyPath

	/**
	 * what the key column shows: the group's own segment — `menu`
	 */
	label: string

	/**
	 * how many keys the group holds, at any depth
	 */
	keys: number
	subRows: TableRow[]
}

/**
 * any row of the translation table
 */
export type TableRow = SectionRow | GroupRow | KeyTableRow

/**
 * how rows are built
 */
export type RowOptions = {
	/**
	 * the project groups its keys in namespaces — each the first segment of a key path
	 */
	namespaced: boolean
}

/**
 * a row's id
 *
 * @param kind - what the row is
 * @param path - its namespace, group path or key path
 *
 * @returns its id — `key:common.save`
 */
export const rowId = (kind: TableRow['kind'], path: string): string => `${kind}${rowIdSeparator}${path}`

/**
 * builds the flat view: one row per key, in a section per namespace
 *
 * @note keys keep the order they come in — the default locale's, then those only other locales have —
 * and each section appears where its first key does; sorting is a view choice made later
 *
 * @param rows - every key, as `list keys` gives them
 * @param options - whether the project has namespaces
 *
 * @returns the sections, each holding its keys — or, without namespaces, the keys themselves
 */
export const buildFlatRows = (rows: readonly KeyRow[], { namespaced }: RowOptions): TableRow[] => {
	if (!namespaced) return rows.map(row => keyRow(row, row.key))
	const sections = new Map<NamespaceName, KeyTableRow[]>()
	for (const row of rows) {
		const { namespace, key } = splitNamespace(row.key)
		const keys = sections.get(namespace) ?? []
		keys.push(keyRow(row, key))
		sections.set(namespace, keys)
	}
	return [...sections].map(([namespace, keys]) => ({
		kind: rowKinds.section,
		id: rowId(rowKinds.section, namespace),
		namespace,
		keys: keys.length,
		subRows: keys
	}))
}

/**
 * @param row - one key, as `list keys` gives it
 * @param label - what the key column shows
 *
 * @returns its table row
 */
const keyRow = ({ key, description, values }: KeyRow, label: string): KeyTableRow => ({
	kind: rowKinds.key,
	id: rowId(rowKinds.key, key),
	key,
	label,
	...(description === undefined ? {} : { description }),
	values
})

/**
 * builds the tree view: nested keys collapse by path segment, inside a section per namespace
 *
 * @note a key row shows its last segment, a group its own; groups and keys keep the order they first
 * come in. A path that is a key in one locale and holds nested keys in another — a conflict `sync`
 * reports — has both rows, the group and the key, which never share an id
 *
 * @param rows - every key, as `list keys` gives them
 * @param options - whether the project has namespaces
 *
 * @returns the sections, each holding its groups and keys — or, without namespaces, the top level
 */
export const buildTreeRows = (rows: readonly KeyRow[], { namespaced }: RowOptions): TableRow[] => {
	const root: Branch = new Map()
	for (const row of rows) {
		const segments = splitKeyPath(row.key)
		let level = root
		for (const [index, segment] of segments.slice(0, -1).entries()) {
			const path = joinKeyPath(segments.slice(0, index + 1))
			const id = rowId(rowKinds.group, path)
			const entry = level.get(id)
			const branch: Branch = entry !== undefined && 'branch' in entry ? entry.branch : new Map()
			if (entry === undefined) level.set(id, { path, label: segment, branch })
			level = branch
		}
		level.set(rowId(rowKinds.key, row.key), { row, label: segments.at(-1) ?? row.key })
	}
	const top = toRows(root)
	if (!namespaced) return top
	return top.map(row =>
		row.kind === rowKinds.group
			? {
					kind: rowKinds.section,
					id: rowId(rowKinds.section, row.path),
					namespace: row.path,
					keys: row.keys,
					subRows: row.subRows
				}
			: row
	)
}

/**
 * one level of the tree as it is built: by row id, a group's own level or a key
 */
type Branch = Map<string, { path: KeyPath; label: string; branch: Branch } | { row: KeyRow; label: string }>

/**
 * @param branch - one level of the tree
 *
 * @returns its rows, groups holding theirs
 */
const toRows = (branch: Branch): TableRow[] =>
	[...branch.values()].map(entry => {
		if ('row' in entry) return keyRow(entry.row, entry.label)
		const subRows = toRows(entry.branch)
		return {
			kind: rowKinds.group,
			id: rowId(rowKinds.group, entry.path),
			path: entry.path,
			label: entry.label,
			keys: subRows.reduce((sum, row) => sum + (row.kind === rowKinds.key ? 1 : row.keys), 0),
			subRows
		}
	})

/**
 * builds the rows of a view mode
 *
 * @note compact has the flat view's rows: what it hides — every locale but the default — is shown
 * inside an expanded key row, never as rows of its own
 *
 * @param mode - the view mode
 * @param rows - every key, as `list keys` gives them
 * @param options - whether the project has namespaces
 *
 * @returns the rows to hand to the table
 */
export const buildRows = (mode: ViewMode, rows: readonly KeyRow[], options: RowOptions): TableRow[] =>
	mode === viewModes.tree ? buildTreeRows(rows, options) : buildFlatRows(rows, options)

/**
 * the view modes a project can use
 *
 * @param capabilities - what the project's format can express
 *
 * @returns the view modes the project can use — the tree needs keys that nest
 */
export const availableViewModes = ({ nesting }: Pick<EngineCapabilities, 'nesting'>): ViewMode[] =>
	Object.values(viewModes).filter(mode => mode !== viewModes.tree || nesting)

/**
 * the view mode to show
 *
 * @param mode - the view mode asked for — `studio.defaultView`, or a remembered choice
 * @param capabilities - what the project's format can express
 *
 * @returns that mode when the project can use it, else the flat view
 */
export const usableViewMode = (mode: ViewMode, capabilities: Pick<EngineCapabilities, 'nesting'>): ViewMode =>
	availableViewModes(capabilities).includes(mode) ? mode : viewModes.flat
