import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
	extensionText,
	namespaceActions,
	rowKinds,
	studioText,
	tableId,
	viewModeLabels,
	viewModes
} from '@linguify/constants'
import type { RowSource } from '@linguify/keys'
import {
	availableViewModes,
	collapsedExpansion,
	countKeys,
	expandedExpansion,
	fill,
	hiddenByView,
	type KeyEdit,
	movedPaths,
	type NamespaceAction,
	type NewKey,
	namespaceWrittenText,
	noFilter,
	rowId,
	usableViewMode,
	withWarnings
} from '@linguify/table'
import {
	focusSection,
	focusTableStop,
	rowSelector,
	useKnownRevision,
	useSelection,
	useTableView
} from '@linguify/table/react'
import type { KeyPath, NamespaceName, ViewMode } from '@linguify/types'
import { useQuery } from '@tanstack/react-query'
import { AddKey } from './add-key'
import { DeleteKeys } from './delete-keys'
import { Filters } from './filters'
import { Grid, selectedRow } from './grid'
import { NamespaceDialog } from './namespace-dialog'
import { WriteNotice } from './notice'
import { type ApiOutputs, useTRPC } from './trpc'
import { useAddKey, useAddNamespace, useEditKey, useRemoveKeys, useRenameNamespace } from './writes'

/**
 * the panel: the project's translations, read through the host, in the view the config names
 * (`extension.defaultView`)
 *
 * @returns the panel's content
 */
export const App = () => {
	const trpc = useTRPC()
	const config = useQuery(trpc.config.get.queryOptions())
	const catalogue = useQuery(trpc.catalogue.get.queryOptions())
	const error = config.error ?? catalogue.error
	if (error !== null) return <p role="alert">{error.data?.linguify?.message ?? error.message}</p>
	if (config.data === undefined || catalogue.data === undefined) return <p>{extensionText.reading}</p>
	return <Panel config={config.data} catalogue={catalogue.data} />
}

/**
 * the panel once the project is read: a toolbar, a notice when a write failed, and below them the grid in a
 * box of its own, which scrolls with its head kept in sight
 *
 * @note the rows, the filter, the sort and what is open come from `useTableView`, as the studio's do — a
 * search, the missing filter and the namespace filter narrow it alike, and an edit under them holds the rows
 * in place
 *
 * @note the box is the containing block of the words only a screen reader hears, which sit out of sight by
 * absolute position: without it they stretch the page itself past the box, and the page scrolls the toolbar
 * away
 */
const Panel = ({
	config,
	catalogue
}: {
	config: ApiOutputs['config']['get']
	catalogue: ApiOutputs['catalogue']['get']
}) => {
	useKnownRevision(catalogue.revision)
	const available = availableViewModes(config.capabilities)
	const [mode, setMode] = useState<ViewMode>(usableViewMode(config.config.extension.defaultView, config.capabilities))
	const source = useMemo(
		(): RowSource => ({
			locales: config.config.locales,
			default: config.config.default,
			descriptions: config.config.description.enabled
		}),
		[config]
	)
	const view = useTableView({ catalogue: catalogue.catalogue, source, namespaced: config.namespaced, mode })
	const rules = useMemo(
		() => ({
			namespaced: config.namespaced,
			nesting: config.capabilities.nesting,
			namespaceFiles: config.namespaceFiles,
			createNamespace: config.config.keys.createNamespace
		}),
		[config]
	)
	const editKey = useEditKey()
	const { pin } = view
	// what the last write did, said until the next selection begins or the next edit
	const [said, setSaid] = useState<string>()
	const onEdit = useCallback(
		(edit: KeyEdit) => {
			pin()
			setSaid(undefined)
			return editKey(edit)
		},
		[pin, editKey]
	)
	const addKey = useAddKey()
	const [adding, setAdding] = useState(false)
	const addButton = useRef<HTMLButtonElement>(null)
	const [lastAdded, setLastAdded] = useState<KeyPath>()
	const added = useMemo(
		() =>
			lastAdded === undefined
				? undefined
				: { key: lastAdded, hidden: hiddenByView(view.keys, view.visible, lastAdded) },
		[lastAdded, view.keys, view.visible]
	)
	const onAdd = async (key: NewKey) => {
		await addKey(key)
		view.reveal(key.path)
		setLastAdded(key.path)
	}
	useLayoutEffect(() => {
		if (lastAdded === undefined) return
		document.querySelector(rowSelector(rowId(rowKinds.key, lastAdded)))?.scrollIntoView({ block: 'nearest' })
	}, [lastAdded])
	const { selection, choose, onSelect, onSelectAll, doomed, setChosenKeys, namespaceRenamed } = useSelection({
		keys: view.keys,
		rows: view.rows,
		visible: view.visible,
		onChoose: () => setSaid(undefined)
	})
	const addNamespace = useAddNamespace()
	const renameNamespace = useRenameNamespace()
	const addNamespaceButton = useRef<HTMLButtonElement>(null)
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
		if (action === undefined) return
		if (action.kind === namespaceActions.rename) {
			const { from } = action
			const renamed = await renameNamespace({ from, to: name })
			view.namespaceRenamed(from, name)
			namespaceRenamed(from, name)
			setLastAdded(current => current && movedPaths([current], from, name)[0])
			setSaid(namespaceWrittenText(action, name, renamed.report, false))
			return
		}
		const added = await addNamespace(name)
		view.namespaceAdded(name)
		setSaid(namespaceWrittenText(action, name, added.report, view.revealing))
	}
	const namespaceClosed = (written: NamespaceName | undefined) => {
		const action = namespaceAction?.action
		setNamespaceAction(undefined)
		const named = written ?? (action?.kind === namespaceActions.rename ? action.from : undefined)
		// the written section, or the one a cancelled rename was about — else the button that opened the dialog
		if (focusSection(named, written !== undefined)) return
		if (action?.kind === namespaceActions.add || !focusTableStop(document.getElementById(tableId)))
			addNamespaceButton.current?.focus()
	}
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
		setSaid(withWarnings(fill(studioText.deleted, { keys: countKeys(removed.report.changes.length) }), removed.report))
		setChosenKeys(new Set())
	}
	const deleteClosed = (deleted: boolean) => {
		setDeleting(false)
		if (!deleted) {
			deleteButton.current?.focus()
			return
		}
		const next =
			after.current === undefined
				? null
				: document.querySelector<HTMLElement>(`${rowSelector(after.current)} [data-select] input`)
		if (next !== null) next.focus()
		else focusTableStop(document.getElementById(tableId))
	}
	if (view.keys.length === 0 && view.namespaces.length === 0) return <p>{studioText.noKeys}</p>
	return (
		<div className="flex h-screen flex-col">
			<div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-1.5">
				<ViewSwitch
					mode={mode}
					available={available}
					onPick={next => {
						setMode(next)
						view.viewChanged(next)
					}}
				/>
				<button
					ref={addButton}
					type="button"
					aria-expanded={adding}
					aria-controls="add-key"
					className={controlClass}
					onClick={() => setAdding(open => !open)}
				>
					{studioText.addKey}
				</button>
				{config.namespaced && (
					<button
						ref={addNamespaceButton}
						type="button"
						aria-haspopup="dialog"
						className={controlClass}
						onClick={() => openNamespaceDialog({ kind: namespaceActions.add })}
					>
						{studioText.addNamespace}
					</button>
				)}
				<button type="button" onClick={() => view.expand(expandedExpansion)} className={controlClass}>
					{studioText.expandAll}
				</button>
				<button type="button" onClick={() => view.expand(collapsedExpansion)} className={controlClass}>
					{studioText.collapseAll}
				</button>
				<button
					ref={deleteButton}
					type="button"
					aria-disabled={selection.size === 0}
					aria-describedby="selection-count"
					className={`${controlClass} aria-disabled:opacity-50`}
					onClick={() => {
						if (selection.size > 0) setDeleting(true)
					}}
				>
					{studioText.deleteSelected}
				</button>
				<button
					type="button"
					aria-disabled={selection.size === 0}
					className={`${controlClass} aria-disabled:opacity-50`}
					onClick={() => choose(() => new Set())}
				>
					{studioText.clearSelection}
				</button>
				<span id="selection-count" role="status" className="wrap-anywhere min-w-0 text-muted-foreground tabular-nums">
					{[selection.size > 0 ? fill(studioText.selectedCount, { keys: countKeys(selection.size) }) : undefined, said]
						.filter(part => part !== undefined)
						.join(studioText.countSeparator)}
				</span>
				<Filters
					filter={view.filter}
					onChange={view.changeFilter}
					namespaces={view.namespaces}
					counts={view.counts}
					shown={view.visible.length}
					total={view.keys.length}
				/>
			</div>
			{adding && (
				<AddKey
					catalogue={catalogue.catalogue}
					locales={source.locales}
					defaultLocale={source.default}
					descriptions={source.descriptions}
					rules={rules}
					added={added}
					onAdd={onAdd}
					onTyping={() => setLastAdded(undefined)}
					onClearFilters={() => view.changeFilter(noFilter)}
					onClose={() => {
						setAdding(false)
						addButton.current?.focus()
					}}
				/>
			)}
			<WriteNotice />
			<div className="relative min-h-0 flex-1 overflow-auto">
				<Grid
					rows={view.rows}
					mode={mode}
					source={source}
					expansion={view.expansion}
					onToggle={view.toggle}
					sort={view.sort}
					onSort={view.onSort}
					onEdit={onEdit}
					selection={selection}
					onSelect={onSelect}
					onSelectAll={onSelectAll}
					onRename={onRename}
				/>
			</div>
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
			{deleting && (
				<DeleteKeys
					keys={doomed.paths}
					hidden={doomed.hidden}
					locales={source.locales}
					onDelete={onDelete}
					onClosed={deleteClosed}
				/>
			)}
		</div>
	)
}

/**
 * flat, tree or compact: native radio buttons, so one stop for Tab and the arrows moving between them come
 * from the browser — a view the project's format cannot show is there, and disabled, as in the studio
 */
const ViewSwitch = ({
	mode,
	available,
	onPick
}: {
	mode: ViewMode
	available: readonly ViewMode[]
	onPick: (mode: ViewMode) => void
}) => (
	<fieldset className="relative inline-flex">
		<legend className="sr-only">{studioText.view}</legend>
		{Object.values(viewModes).map(view => (
			<label
				key={view}
				className={`${controlClass} has-checked:border-chosen-border has-checked:bg-chosen has-checked:font-semibold has-checked:text-chosen-foreground has-disabled:opacity-50 has-focus-visible:outline has-focus-visible:outline-focus has-focus-visible:outline-offset-2`}
			>
				<input
					type="radio"
					name="view"
					value={view}
					checked={view === mode}
					disabled={!available.includes(view)}
					onChange={() => onPick(view)}
					className="sr-only"
				/>
				{viewModeLabels[view]}
			</label>
		))}
	</fieldset>
)

const controlClass = 'border border-control-border bg-control px-2 py-0.5 text-control-foreground'
