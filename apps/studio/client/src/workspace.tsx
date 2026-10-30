import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { studioText, viewModes } from '@linguify/constants'
import {
	availableViewModes,
	buildRows,
	collapsedExpansion,
	columnShown,
	countUntranslated,
	type Expansion,
	expandedExpansion,
	filterKeys,
	isFiltered,
	type KeyEdit,
	type KeyFilter,
	type KeySort,
	namespacesOf,
	narrowsView,
	nextSort,
	noFilter,
	pinnedKeys,
	type RowSource,
	revealsMatches,
	rowsFromCatalogue,
	searchExpansion,
	sectionsExpansion,
	sortKeys,
	toggleExpansion
} from '@linguify/table'
import type { KeyPath, ViewMode } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { ListChevronsDownUpIcon, ListChevronsUpDownIcon } from 'lucide-react'
import { focusRingClass } from './classes'
import { Filters } from './filters'
import { Toolbar } from './toolbar'
import { TranslationTable } from './translation-table'
import type { ApiOutputs } from './trpc'
import { useViewMode } from './use-view-mode'
import { ViewSwitch } from './view-switch'
import { useEditKey, useKnownRevision } from './writes'

/**
 * the project, once read: the toolbar with the view's controls, and the table
 *
 * @note each view mode keeps its own expansion, so switching modes and back finds rows as they were; the
 * compact view starts with its sections open and its keys closed. While a search or the still-to-translate
 * filter is on, the table shows {@link searchExpansion} instead — a layer per view that opening and closing
 * rows changes until the search ends, never the view's own expansion. Sorting reorders the screen only;
 * nothing is written, and a sort by a column the view does not show is dropped
 *
 * @note only what changed renders again: the keys are read from the catalogue once, sorted once per sort,
 * and filtered from that; a kept key keeps its row, and the rows' toggle never changes. The middle is
 * contained, so typing in the toolbar does not lay out the table again
 *
 * @note an edit under a search, filter or sort holds the rows shown as they are ({@link pinnedKeys}), so the
 * key just changed neither moves nor disappears under the person's hands; changing the search, a filter,
 * the sort or the view lets go
 *
 * @param props - `config` and `catalogue`, as the API gave them; `error`, a failed refresh's message,
 * shown above what was read
 *
 * @returns the toolbar and the page's middle
 */
export const Workspace = memo(
	({
		config,
		catalogue,
		error
	}: {
		config: ApiOutputs['config']['get']
		catalogue: ApiOutputs['catalogue']['get']
		error: string | undefined
	}) => {
		const [mode, pick] = useViewMode(config.config.studio.defaultView, config.capabilities)
		const source = useMemo(
			(): RowSource => ({
				locales: config.config.locales,
				default: config.config.default,
				descriptions: config.config.description.enabled
			}),
			[config]
		)
		const keys = useMemo(() => rowsFromCatalogue(catalogue.catalogue, source), [catalogue, source])
		const counts = useMemo(() => countUntranslated(keys, source.locales, source.default), [keys, source])
		const namespaces = useMemo(() => (config.namespaced ? namespacesOf(keys) : []), [keys, config.namespaced])
		const [chosen, setChosen] = useState<KeyFilter>(noFilter)
		// a namespace or locale gone since it was chosen — renamed, deleted, or out of the config — is let go
		const filter = useMemo((): KeyFilter => {
			const kept = chosen.namespaces?.filter(namespace => namespaces.includes(namespace))
			return {
				search: chosen.search,
				untranslatedIn: chosen.untranslatedIn.filter(locale => Object.hasOwn(counts, locale)),
				namespaces: kept === undefined || kept.length === 0 ? undefined : kept
			}
		}, [chosen, counts, namespaces])
		const [sort, setSort] = useState<KeySort>()
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
		const rows = useMemo(
			() => buildRows(mode, visible, { namespaced: config.namespaced }),
			[mode, visible, config.namespaced]
		)

		const initial = useMemo(
			() => (mode === viewModes.compact ? sectionsExpansion(rows) : expandedExpansion),
			[mode, rows]
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
		const changeMode = (next: ViewMode) => {
			pick(next)
			setPinned(undefined)
			setSort(current =>
				current !== undefined && columnShown(current.column, next, source.default) ? current : undefined
			)
		}
		const onSort = useCallback((column: KeySort['column']) => {
			setPinned(undefined)
			setSort(current => nextSort(current, column))
		}, [])
		useKnownRevision(catalogue.revision)
		const editKey = useEditKey()
		const onEdit = useCallback(
			(edit: KeyEdit) => {
				const { visible, narrowed } = latest.current
				if (narrowed) setPinned(current => current ?? visible.map(row => row.key))
				return editKey(edit)
			},
			[editKey]
		)
		return (
			<>
				<Toolbar>
					<ViewSwitch mode={mode} available={availableViewModes(config.capabilities)} onPick={changeMode} />
					<Filters
						filter={filter}
						onChange={changeFilter}
						namespaces={namespaces}
						counts={counts}
						shown={visible.length}
						total={keys.length}
					/>
					<Button variant="ghost" size="sm" className={focusRingClass} onClick={() => expand(expandedExpansion)}>
						<ListChevronsUpDownIcon data-icon="inline-start" />
						{studioText.expandAll}
					</Button>
					<Button variant="ghost" size="sm" className={focusRingClass} onClick={() => expand(collapsedExpansion)}>
						<ListChevronsDownUpIcon data-icon="inline-start" />
						{studioText.collapseAll}
					</Button>
				</Toolbar>
				<main className="flex min-h-0 flex-1 flex-col overflow-auto contain-content">
					{error !== undefined && (
						<p id="error" role="alert" className="p-4 text-destructive">
							{error}
						</p>
					)}
					{rows.length === 0 ? (
						<p id="empty" className="p-4 text-muted-foreground">
							{isFiltered(filter) ? studioText.noMatches : studioText.noKeys}
						</p>
					) : (
						<TranslationTable
							rows={rows}
							mode={mode}
							source={source}
							expansion={expansion}
							onToggle={toggle}
							sort={sort}
							onSort={onSort}
							onEdit={onEdit}
						/>
					)}
				</main>
			</>
		)
	}
)
