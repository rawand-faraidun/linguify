import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { tableOpenLimit, viewModes } from '@linguify/constants'
import { keyRows, localeOrder, namespacesIn, type RowSource } from '@linguify/keys'
import type { Catalogue, KeyPath, KeyRow, NamespaceName, ViewMode } from '@linguify/types'
import {
	collapsedExpansion,
	type Expansion,
	expandedExpansion,
	revealKey,
	searchExpansion,
	sectionsExpansion,
	toggleExpansion
} from '../expansion'
import {
	countUntranslated,
	emptyNamespacesShown,
	filterKeys,
	type KeyFilter,
	narrowsView,
	noFilter,
	pinnedKeys,
	revealsMatches
} from '../filter'
import { movedExpansion, movedFilter, movedPaths } from '../rename'
import { buildRows, keepUnchangedRows } from '../rows'
import { columnShown, type KeySort, nextSort, sortKeys } from '../sort'

/**
 * the translation table as a person narrows and opens it — what the studio and the extension both show,
 * each in its own look: the rows for the view, after the search, the missing filter, the namespace filter and
 * the sort, and which of them are open
 *
 * @note rows a write left as they were stay the same rows, so only the changed ones are drawn again. A
 * namespace or locale gone since it was chosen in the filter is let go. Rows `pin`ned while a person edits
 * under a filter or a sort stay put, so the text they edit does not jump away; a change of filter, sort or
 * view lets them go. Each view keeps which rows are open, and a search or the missing filter opens a layer
 * of its own over that, gone with them. A large project opens with its sections closed
 *
 * @param project - the `catalogue` as read, the `source` locales, whether keys are `namespaced`, the view
 * `mode`, and the filter and sort `restored` from an earlier showing, if any
 *
 * @returns the rows, the filter and the sort, the expansion, and what changes each; the state itself too, for
 * a surface that carries it through a change of its own — a namespace renamed
 */
export const useTableView = ({
	catalogue,
	source,
	namespaced,
	mode,
	restored
}: {
	catalogue: Catalogue
	source: RowSource
	namespaced: boolean
	mode: ViewMode
	restored?: { filter?: KeyFilter | undefined; sort?: KeySort | undefined } | undefined
}) => {
	const earlier = useRef<readonly KeyRow[]>([])
	const keys = useMemo(() => {
		const read = keepUnchangedRows(earlier.current, keyRows(catalogue, source))
		earlier.current = read
		return read
	}, [catalogue, source])
	const counts = useMemo(() => countUntranslated(keys, source.locales, source.default), [keys, source])
	const namespaces = useMemo(
		() => (namespaced ? namespacesIn(catalogue, localeOrder(source)) : []),
		[catalogue, namespaced, source]
	)
	const [chosen, setChosen] = useState<KeyFilter>(restored?.filter ?? noFilter)
	const filter = useMemo((): KeyFilter => {
		const kept = chosen.namespaces?.filter((namespace: NamespaceName) => namespaces.includes(namespace))
		return {
			search: chosen.search,
			untranslatedIn: chosen.untranslatedIn.filter(locale => Object.hasOwn(counts, locale)),
			namespaces: kept === undefined || kept.length === 0 ? undefined : kept
		}
	}, [chosen, counts, namespaces])
	const [sort, setSort] = useState<KeySort | undefined>(restored?.sort)
	const search = useDeferredValue(filter.search)
	const sorted = useMemo(() => (sort === undefined ? keys : sortKeys(keys, sort)), [keys, sort])
	const [pinned, setPinned] = useState<readonly KeyPath[]>()
	const visible = useMemo(() => {
		if (pinned !== undefined) return pinnedKeys(keys, pinned)
		return filterKeys(
			sorted,
			{ search, untranslatedIn: filter.untranslatedIn, namespaces: filter.namespaces },
			source.default
		)
	}, [pinned, keys, sorted, search, filter.untranslatedIn, filter.namespaces, source.default])
	const emptyNamespaces = useMemo(
		() => emptyNamespacesShown(namespaces, keys, { ...filter, search }),
		[namespaces, keys, filter, search]
	)
	const rows = useMemo(
		() => buildRows(mode, visible, { namespaced, emptyNamespaces }),
		[mode, visible, namespaced, emptyNamespaces]
	)
	const large = keys.length > tableOpenLimit
	const initial = useMemo(
		() => (large ? collapsedExpansion : mode === viewModes.compact ? sectionsExpansion(rows) : expandedExpansion),
		[large, mode, rows]
	)
	const [expansions, setExpansions] = useState<Partial<Record<ViewMode, Expansion>>>({})
	const base = expansions[mode] ?? initial
	const revealing = revealsMatches({ ...filter, search })
	const revealed = useMemo(() => searchExpansion(base, rows, mode), [base, rows, mode])
	const [layers, setLayers] = useState<Partial<Record<ViewMode, Expansion>>>({})
	const expansion = revealing ? (layers[mode] ?? revealed) : base
	const narrowed = narrowsView(filter, sort)
	const latest = useRef({ mode, initial, revealing, revealed, visible, narrowed })
	latest.current = { mode, initial, revealing, revealed, visible, narrowed }
	const toggle = useCallback((id: string) => {
		const { mode, initial, revealing, revealed } = latest.current
		if (revealing) setLayers(current => ({ ...current, [mode]: toggleExpansion(current[mode] ?? revealed, id) }))
		else setExpansions(current => ({ ...current, [mode]: toggleExpansion(current[mode] ?? initial, id) }))
	}, [])
	const expand = (next: Expansion) =>
		revealing
			? setLayers(current => ({ ...current, [mode]: next }))
			: setExpansions(current => ({ ...current, [mode]: next }))
	const changeFilter = (next: KeyFilter) => {
		if (!revealsMatches(next)) setLayers({})
		setPinned(undefined)
		setChosen(next)
	}
	const onSort = useCallback((column: KeySort['column']) => {
		setPinned(undefined)
		setSort(current => nextSort(current, column))
	}, [])
	/**
	 * lets go of held rows and of a sort the new view does not show — after the view changes
	 */
	const viewChanged = (next: ViewMode) => {
		setPinned(undefined)
		setSort(current =>
			current !== undefined && columnShown(current.column, next, source.default) ? current : undefined
		)
	}
	/**
	 * brings a key just added into sight: held rows take it in, and its section and groups open
	 *
	 * @param path - the key added
	 */
	const reveal = (path: KeyPath) => {
		const { mode, revealing, revealed, initial } = latest.current
		setPinned(current => (current === undefined ? undefined : [...current, path]))
		const opened = (current: Partial<Record<ViewMode, Expansion>>, start: Expansion) => ({
			...current,
			[mode]: revealKey(current[mode] ?? start, path, { mode, namespaced })
		})
		if (revealing) setLayers(current => opened(current, revealed))
		else setExpansions(current => opened(current, initial))
	}
	/**
	 * holds the rows on screen in place while a person edits under a filter or a sort
	 */
	const pin = useCallback(() => {
		const { visible, narrowed } = latest.current
		if (narrowed) setPinned(current => current ?? visible.map(row => row.key))
	}, [])
	const namespaceRenamed = useCallback((from: NamespaceName, to: NamespaceName) => {
		const move = (current: Partial<Record<ViewMode, Expansion>>) =>
			Object.fromEntries(
				Object.entries(current).map(([view, expansion]) => [view, movedExpansion(expansion, from, to)])
			)
		setPinned(current => current && movedPaths(current, from, to))
		setChosen(current => movedFilter(current, from, to))
		setExpansions(move)
		setLayers(move)
	}, [])
	// a namespace filter on: the new one joins it, as a person adding it means to see it
	const namespaceAdded = useCallback(
		(name: NamespaceName) =>
			setChosen(current =>
				current.namespaces === undefined ? current : { ...current, namespaces: [...current.namespaces, name] }
			),
		[]
	)
	return {
		keys,
		counts,
		namespaceRenamed,
		namespaceAdded,
		namespaces,
		filter,
		search,
		sort,
		visible,
		rows,
		emptyNamespaces,
		expansion,
		revealing,
		revealed,
		initial,
		narrowed,
		toggle,
		expand,
		changeFilter,
		onSort,
		viewChanged,
		pin,
		reveal,
		latest,
		setChosen,
		setPinned,
		setExpansions,
		setLayers
	}
}
