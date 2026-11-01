import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { namespaceActions, rowKinds, studioText, tableId } from '@linguify/constants'
import { localeOrder, type RowSource } from '@linguify/keys'
import {
	availableViewModes,
	collapsedExpansion,
	countKeys,
	type Expansion,
	expandedExpansion,
	fill,
	focusTableStop,
	hiddenByView,
	isFiltered,
	type KeyEdit,
	movedExpansion,
	movedFilter,
	movedPaths,
	movedSelection,
	type NamespaceAction,
	type NewKey,
	noFilter,
	pinnedKeys,
	revealsMatches,
	rowId,
	rowSelector,
	searchExpansion,
	withWarnings
} from '@linguify/table'
import { useSelection, useTableView } from '@linguify/table/react'
import type { KeyPath, NamespaceName, ViewMode } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { cn } from '@linguify/ui/lib/utils'
import { FolderPlusIcon, ListChevronsDownUpIcon, ListChevronsUpDownIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { AddKey, addKeyFormId } from './add-key'
import { destructiveClass, focusRingClass } from './classes'
import { DeleteKeys } from './delete-keys'
import { Filters, searchId } from './filters'
import { NamespaceDialog } from './namespace-dialog'
import { ProjectActions } from './project-actions'
import { Toolbar } from './toolbar'
import { selectedRow, TranslationTable } from './translation-table'
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
		// the rows, the filter, the sort and what is open — the view the extension's panel shares
		const {
			keys,
			counts,
			namespaces,
			filter,
			search,
			sort,
			visible,
			rows,
			expansion,
			toggle,
			expand,
			changeFilter,
			onSort,
			viewChanged,
			pin,
			reveal,
			setChosen,
			setPinned,
			setExpansions,
			setLayers
		} = useTableView({ catalogue: catalogue.catalogue, source, namespaced: config.namespaced, mode })
		// a refresh shows the files as they are: rows held behind an earlier edit are let go
		useEffect(() => onRefresh(() => setPinned(undefined)), [setPinned])
		const changeMode = (next: ViewMode) => {
			pick(next)
			viewChanged(next)
		}
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
			} else if (action?.kind === namespaceActions.add || !focusTableStop(document.getElementById(tableId)))
				addNamespaceButton.current?.focus()
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
			reveal(key.path)
			setLastAdded(key.path)
		}
		// what the last write did, said until the next selection begins
		const [said, setSaid] = useState<string>()
		const { selection, choose, onSelect, onSelectAll, doomed, setChosenKeys } = useSelection({
			keys,
			rows,
			visible,
			onChoose: () => setSaid(undefined)
		})
		const removeKeys = useRemoveKeys()
		const [deleting, setDeleting] = useState(false)
		const deleteButton = useRef<HTMLButtonElement>(null)
		// after a delete, the keyboard goes to the row after the last one deleted, so the person keeps their place
		const after = useRef<string | undefined>(undefined)
		const onDelete = async () => {
			const shown = [...document.querySelectorAll(`#${tableId} tbody tr[data-row]`)]
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
			else if (!focusTableStop(document.getElementById(tableId)))
				(document.getElementById(searchId) ?? addButton.current)?.focus()
		}
		useLayoutEffect(() => {
			if (lastAdded === undefined) return
			document.querySelector(rowSelector(rowId(rowKinds.key, lastAdded)))?.scrollIntoView({ block: 'nearest' })
		}, [lastAdded])
		const onEdit = useCallback(
			(edit: KeyEdit) => {
				pin()
				setSaid(undefined)
				return editKey(edit)
			},
			[editKey, pin]
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
