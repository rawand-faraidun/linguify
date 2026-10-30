import { memo, useCallback, useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { rowKinds, studioText, viewModes } from '@linguify/constants'
import {
	availableViewModes,
	buildRows,
	bulkDelete,
	collapsedExpansion,
	columnShown,
	countUntranslated,
	type Expansion,
	expandedExpansion,
	filterKeys,
	hiddenByView,
	isFiltered,
	type KeyEdit,
	type KeyFilter,
	type KeySort,
	keepExisting,
	localeOrder,
	type NewKey,
	namespacesOf,
	narrowsView,
	nextSort,
	noFilter,
	pinnedKeys,
	type RowSource,
	revealKey,
	revealsMatches,
	rowId,
	rowsFromCatalogue,
	type Selection,
	searchExpansion,
	sectionsExpansion,
	sortKeys,
	type TableRow,
	toggleAll,
	toggleExpansion,
	toggleSelection
} from '@linguify/table'
import type { KeyPath, ViewMode } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { cn } from '@linguify/ui/lib/utils'
import { ListChevronsDownUpIcon, ListChevronsUpDownIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { AddKey, addKeyFormId } from './add-key'
import { destructiveClass, focusRingClass } from './classes'
import { DeleteKeys } from './delete-keys'
import { Filters, searchId } from './filters'
import { countKeys, fill } from './format'
import { Toolbar } from './toolbar'
import { focusTableStop, TranslationTable, translationsId } from './translation-table'
import type { ApiOutputs } from './trpc'
import { useViewMode } from './use-view-mode'
import { ViewSwitch } from './view-switch'
import { useAddKey, useEditKey, useKnownRevision, useRemoveKeys } from './writes'

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
 * @note a key is added in a form above the table, outside its rows, so the rows on screen are still exactly
 * the table's own; a key added while the rows are held joins them
 *
 * @note keys are selected by path, so a selection outlives a change of view, search, filter or sort, and a
 * key gone from disk drops out of it; select-all takes in what the view holds, and a bulk delete removes
 * every selected key, those a filter hides too — its confirmation says how many
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
		const addKey = useAddKey(source.default)
		const [adding, setAdding] = useState(false)
		const addButton = useRef<HTMLButtonElement>(null)
		const locales = useMemo(() => localeOrder(source), [source])
		const rules = useMemo(
			() => ({
				namespaced: config.namespaced,
				nesting: config.capabilities.nesting,
				createNamespace: config.config.keys.createNamespace
			}),
			[config]
		)
		const [lastAdded, setLastAdded] = useState<KeyPath>()
		const added = useMemo(
			() => (lastAdded === undefined ? undefined : { key: lastAdded, hidden: hiddenByView(keys, visible, lastAdded) }),
			[lastAdded, keys, visible]
		)
		const onAdd = async (key: NewKey) => {
			await addKey(key)
			const { mode, revealing } = latest.current
			// held rows take the new key in; its section and groups open, so it is in sight
			setPinned(current => (current === undefined ? undefined : [...current, key.path]))
			const reveal = (current: Partial<Record<ViewMode, Expansion>>, start: Expansion) => ({
				...current,
				[mode]: revealKey(current[mode] ?? start, key.path, { mode, namespaced: config.namespaced })
			})
			if (revealing) setLayers(current => reveal(current, latest.current.revealed))
			else setExpansions(current => reveal(current, latest.current.initial))
			setLastAdded(key.path)
		}
		const [chosenKeys, setChosenKeys] = useState<Selection>(new Set())
		// a key gone since it was ticked — deleted, renamed, or read again from disk — is let go
		const selection = useMemo(() => keepExisting(chosenKeys, keys), [chosenKeys, keys])
		const [deleted, setDeleted] = useState<number>()
		const selecting = useRef({ keys, rows })
		selecting.current = { keys, rows }
		const choose = useCallback((change: (current: Selection) => Selection) => {
			setDeleted(undefined)
			setChosenKeys(current => change(keepExisting(current, selecting.current.keys)))
		}, [])
		const onSelect = useCallback((row: TableRow) => choose(current => toggleSelection(current, row)), [choose])
		const onSelectAll = useCallback(() => choose(current => toggleAll(current, selecting.current.rows)), [choose])
		const removeKeys = useRemoveKeys()
		const [deleting, setDeleting] = useState(false)
		const deleteButton = useRef<HTMLButtonElement>(null)
		const doomed = useMemo(() => bulkDelete(selection, keys, visible), [selection, keys, visible])
		// after a delete, the keyboard goes to the row after the last one deleted, so the person keeps their place
		const after = useRef<string | undefined>(undefined)
		const onDelete = async () => {
			const shown = [...document.querySelectorAll(`#${translationsId} tbody tr[data-row]`)]
			const last = shown.findLastIndex(row => row.getAttribute('data-state') === 'selected')
			after.current =
				shown
					.slice(last + 1)
					.find(row => row.getAttribute('data-state') !== 'selected')
					?.getAttribute('data-row') ?? undefined
			await removeKeys(doomed.paths)
			setDeleted(doomed.paths.length)
			setChosenKeys(new Set())
		}
		const afterDelete = () => {
			const next =
				after.current === undefined
					? null
					: document.querySelector<HTMLElement>(
							`#${translationsId} tr[data-row="${CSS.escape(after.current)}"] [data-select] [role="checkbox"]`
						)
			if (next !== null) next.focus()
			else if (!focusTableStop()) (document.getElementById(searchId) ?? addButton.current)?.focus()
		}
		useLayoutEffect(() => {
			if (lastAdded === undefined) return
			document
				.querySelector(`#${translationsId} tr[data-row="${CSS.escape(rowId(rowKinds.key, lastAdded))}"]`)
				?.scrollIntoView({ block: 'nearest' })
		}, [lastAdded])
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
					<Button
						ref={addButton}
						variant="outline"
						size="sm"
						className={focusRingClass}
						aria-expanded={adding}
						aria-controls={adding ? addKeyFormId : undefined}
						onClick={() => setAdding(open => !open)}
					>
						<PlusIcon data-icon="inline-start" />
						{studioText.addKey}
					</Button>
					<Button
						ref={deleteButton}
						variant="destructive"
						size="sm"
						className={cn(destructiveClass, focusRingClass, 'aria-disabled:opacity-50')}
						aria-disabled={selection.size === 0}
						aria-describedby="selection-count"
						onClick={() => {
							if (selection.size > 0) setDeleting(true)
						}}
					>
						<Trash2Icon data-icon="inline-start" />
						{studioText.deleteSelected}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className={cn(focusRingClass, 'aria-disabled:opacity-50')}
						aria-disabled={selection.size === 0}
						onClick={() => choose(() => new Set())}
					>
						{studioText.clearSelection}
					</Button>
					<span id="selection-count" role="status" className="text-muted-foreground text-xs tabular-nums">
						{selection.size > 0
							? fill(studioText.selectedCount, { keys: countKeys(selection.size) })
							: deleted === undefined
								? ''
								: fill(studioText.deleted, { keys: countKeys(deleted) })}
					</span>
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
					{adding && (
						<AddKey
							catalogue={catalogue.catalogue}
							locales={locales}
							defaultLocale={source.default}
							descriptions={source.descriptions}
							rules={rules}
							added={added}
							onAdd={onAdd}
							onTyping={() => setLastAdded(undefined)}
							onClearFilters={() => changeFilter(noFilter)}
							onClose={() => {
								setAdding(false)
								addButton.current?.focus()
							}}
						/>
					)}
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
							selection={selection}
							onSelect={onSelect}
							onSelectAll={onSelectAll}
						/>
					)}
				</main>
				<DeleteKeys
					open={deleting}
					onOpenChange={setDeleting}
					keys={doomed.paths}
					hidden={doomed.hidden}
					locales={locales}
					onDelete={onDelete}
					onDeleted={afterDelete}
					onCancelled={() => deleteButton.current?.focus()}
				/>
			</>
		)
	}
)
