import { rowIdSeparator, rowKinds } from '@linguify/constants'
import { splitNamespace } from '@linguify/keys'
import type { KeyPath, KeyRow, Locale, NamespaceName } from '@linguify/types'

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
 * any row of the translation table
 */
export type TableRow = SectionRow | KeyTableRow

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
 * @param kind - what the row is
 * @param path - its namespace, group path or key path
 *
 * @returns its id — `key:common.save`
 */
export const rowId = (kind: TableRow['kind'] | typeof rowKinds.group, path: string): string =>
	`${kind}${rowIdSeparator}${path}`

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
export const buildFlatRows = (rows: KeyRow[], { namespaced }: RowOptions): TableRow[] => {
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
