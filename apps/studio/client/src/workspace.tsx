import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { namespaceActions, rowKinds, studioText, viewModes } from '@linguify/constants'
import { keyRows, localeOrder, namespacesIn, type RowSource } from '@linguify/keys'
import {
	availableViewModes,
	buildRows,
	bulkDelete,
	collapsedExpansion,
	columnShown,
	countUntranslated,
	type Expansion,
	emptyNamespacesShown,
	expandedExpansion,
	filterKeys,
	hiddenByView,
	isFiltered,
	type KeyEdit,
	type KeyFilter,
	type KeySort,
	keepExisting,
	movedExpansion,
	movedFilter,
	movedPaths,
	movedSelection,
	type NamespaceAction,
	type NewKey,
	narrowsView,
	nextSort,
	noFilter,
	pinnedKeys,
	revealKey,
	revealsMatches,
	rowId,
	type Selection,
	searchExpansion,
	sectionsExpansion,
	sortKeys,
	type TableRow,
	toggleAll,
	toggleExpansion,
	toggleSelection
} from '@linguify/table'
import type { KeyPath, NamespaceName, ViewMode } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { cn } from '@linguify/ui/lib/utils'
import { FolderPlusIcon, ListChevronsDownUpIcon, ListChevronsUpDownIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { AddKey, addKeyFormId } from './add-key'
import { destructiveClass, focusRingClass } from './classes'
import { DeleteKeys } from './delete-keys'
import { Filters, searchId } from './filters'
import { countKeys, fill } from './format'
import { NamespaceDialog } from './namespace-dialog'
import { ProjectActions } from './project-actions'
import { Toolbar } from './toolbar'
import { focusTableStop, rowSelector, selectedRow, TranslationTable, translationsId } from './translation-table'
import { type ApiOutputs, onRefresh } from './trpc'
import { useViewMode } from './use-view-mode'
import { ViewSwitch } from './view-switch'
import { useAddKey, useAddNamespace, useEditKey, useKnownRevision, useRemoveKeys, useRenameNamespace } from './writes'

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
 * @note namespaces are read from the files, so one just added or emptied has its section; a rename carries
 * what was selected, held or filtered in it to its new name
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
		const keys = useMemo(() => keyRows(catalogue.catalogue, source), [catalogue, source])
		const counts = useMemo(() => countUntranslated(keys, source.locales, source.default), [keys, source])
		const namespaces = useMemo(
			() => (config.namespaced ? namespacesIn(catalogue.catalogue, localeOrder(source)) : []),
			[catalogue, config.namespaced, source]
		)
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
		// a refresh shows the files as they are: rows held behind an earlier edit are let go
		useEffect(() => onRefresh(() => setPinned(undefined)), [])
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
			() => buildRows(mode, visible, { namespaced: config.namespaced, emptyNamespaces }),
			[mode, visible, config.namespaced, emptyNamespaces]
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
		const addKey = useAddKey()
		const [adding, setAdding] = useState(false)
		const addButton = useRef<HTMLButtonElement>(null)
		const addNamespaceButton = useRef<HTMLButtonElement>(null)
		const addNamespace = useAddNamespace()
		const renameNamespace = useRenameNamespace()
		const [namespaceAction, setNamespaceAction] = useState<{ action: NamespaceAction; opening: number }>()
		const openNamespaceDialog = useCallback(
			(action: NamespaceAction) => setNamespaceAction(current => ({ action, opening: (current?.opening ?? 0) + 1 })),
			[]
		)
		const onRename = useCallback(
			(namespace: NamespaceName) => openNamespaceDialog({ kind: namespaceActions.rename, from: namespace }),
			[openNamespaceDialog]
		)
		const writeNamespace = async (name: NamespaceName) => {
			const action = namespaceAction?.action
			if (action?.kind === namespaceActions.rename) {
				const { from } = action
				const renamed = await renameNamespace({ from, to: name })
				const move = (current: Partial<Record<ViewMode, Expansion>>) =>
					Object.fromEntries(
						Object.entries(current).map(([view, expansion]) => [view, movedExpansion(expansion, from, name)])
					)
				setChosenKeys(current => movedSelection(current, from, name))
				setPinned(current => current && movedPaths(current, from, name))
				setChosen(current => movedFilter(current, from, name))
				setExpansions(move)
				setLayers(move)
				setLastAdded(current => current && movedPaths([current], from, name)[0])
				setSaid(withWarnings(fill(studioText.renamedNamespace, { from, to: name }), renamed.report))
				return
			}
			const added = await addNamespace(name)
			// a namespace filter on: the new one joins it, as a person adding it means to see it
			setChosen(current =>
				current.namespaces === undefined ? current : { ...current, namespaces: [...current.namespaces, name] }
			)
			setSaid(
				withWarnings(
					fill(revealsMatches({ ...filter, search }) ? studioText.addedNamespaceHidden : studioText.addedNamespace, {
						name
					}),
					added.report
				)
			)
		}
		const namespaceClosed = (written: NamespaceName | undefined) => {
			const action = namespaceAction?.action
			setNamespaceAction(undefined)
			const named = written ?? (action?.kind === namespaceActions.rename ? action.from : undefined)
			// the written section, on its disclosure — or its rename, when it holds no key — or, cancelled, the
			// button that opened the dialog
			const row = named === undefined ? null : document.querySelector(rowSelector(rowId(rowKinds.section, named)))
			const target =
				(written === undefined
					? row?.querySelector<HTMLElement>('[data-rename]')
					: (row?.querySelector<HTMLElement>('[data-disclosure]') ??
						row?.querySelector<HTMLElement>('[data-rename]'))) ?? null
			if (target !== null) {
				target.focus()
				target.scrollIntoView({ block: 'nearest' })
			} else if (action?.kind === namespaceActions.add || !focusTableStop()) addNamespaceButton.current?.focus()
		}
		const locales = useMemo(() => localeOrder(source), [source])
		const rules = useMemo(
			() => ({
				namespaced: config.namespaced,
				nesting: config.capabilities.nesting,
				namespaceFiles: config.namespaceFiles,
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
		// what the last write did, said until the next selection begins
		const [said, setSaid] = useState<string>()
		const selecting = useRef({ keys, rows })
		selecting.current = { keys, rows }
		const choose = useCallback((change: (current: Selection) => Selection) => {
			setSaid(undefined)
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
			const last = shown.findLastIndex(row => row.getAttribute('data-state') === selectedRow)
			after.current =
				shown
					.slice(last + 1)
					.find(row => row.getAttribute('data-state') !== selectedRow)
					?.getAttribute('data-row') ?? undefined
			const removed = await removeKeys(doomed.paths)
			// what core removed, and anything it left — a path holding keys of its own in another locale
			setSaid(
				withWarnings(fill(studioText.deleted, { keys: countKeys(removed.report.changes.length) }), removed.report)
			)
			setChosenKeys(new Set())
		}
		const afterDelete = () => {
			const next =
				after.current === undefined
					? null
					: document.querySelector<HTMLElement>(`${rowSelector(after.current)} [data-select] [role="checkbox"]`)
			if (next !== null) next.focus()
			else if (!focusTableStop()) (document.getElementById(searchId) ?? addButton.current)?.focus()
		}
		useLayoutEffect(() => {
			if (lastAdded === undefined) return
			document.querySelector(rowSelector(rowId(rowKinds.key, lastAdded)))?.scrollIntoView({ block: 'nearest' })
		}, [lastAdded])
		const onEdit = useCallback(
			(edit: KeyEdit) => {
				const { visible, narrowed } = latest.current
				if (narrowed) setPinned(current => current ?? visible.map(row => row.key))
				setSaid(undefined)
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
					<ProjectActions
						defaults={{ removeUnused: config.config.sync.removeUnused, format: config.config.io.format }}
						cwd={config.cwd}
						revision={catalogue.revision}
						onDone={said => {
							setSaid(said)
							// keys the action added or removed show as the view says, not held behind an earlier edit
							setPinned(undefined)
						}}
					/>
					{config.namespaced && (
						<Button
							ref={addNamespaceButton}
							variant="outline"
							size="sm"
							className={focusRingClass}
							onClick={() => openNamespaceDialog({ kind: namespaceActions.add })}
						>
							<FolderPlusIcon data-icon="inline-start" />
							{studioText.addNamespace}
						</Button>
					)}
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
					<span
						id="selection-count"
						role="status"
						className="wrap-anywhere min-w-0 text-muted-foreground text-xs tabular-nums"
					>
						{[
							selection.size > 0 ? fill(studioText.selectedCount, { keys: countKeys(selection.size) }) : undefined,
							said
						]
							.filter(part => part !== undefined)
							.join(studioText.countSeparator)}
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
				<main className="flex min-h-0 flex-1 scroll-pt-10 flex-col overflow-auto contain-content">
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
							onRename={onRename}
						/>
					)}
				</main>
				{namespaceAction !== undefined && (
					<NamespaceDialog
						key={namespaceAction.opening}
						action={namespaceAction.action}
						catalogue={catalogue.catalogue}
						namespaceFiles={config.namespaceFiles}
						onSubmit={writeNamespace}
						onClosed={namespaceClosed}
					/>
				)}
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

/**
 * @param done - what a write did, in words
 * @param report - what core reported of it
 *
 * @returns the words, then each warning core gave — what it left as it was, and why
 */
const withWarnings = (done: string, report: { warnings: readonly { message: string }[] }): string =>
	[done, ...report.warnings.map(warning => warning.message)].join(' ')
