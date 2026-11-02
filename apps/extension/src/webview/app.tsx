import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { extensionText, namespaceActions, studioText, viewModeLabels, viewModes } from '@linguify/constants'
import {
	availableViewModes,
	collapsedExpansion,
	emptyViewText,
	expandedExpansion,
	newKeyRulesOf,
	noFilter,
	rowSourceOf,
	selectionStatus,
	usableViewMode
} from '@linguify/table'
import { useKnownRevision, useTableView, useTableWrites } from '@linguify/table/react'
import type { ViewMode } from '@linguify/types'
import { useQuery } from '@tanstack/react-query'
import { AddKey } from './add-key'
import { DeleteKeys } from './delete-keys'
import { Filters } from './filters'
import { Freshness } from './freshness'
import { Grid } from './grid'
import { NamespaceDialog } from './namespace-dialog'
import { WriteNotice } from './notice'
import { keepView, keptView } from './page'
import { type ApiOutputs, onRefresh, useTRPC } from './trpc'
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
	const failed = config.error ?? catalogue.error
	const error = failed === null ? undefined : (failed.data?.linguify?.message ?? failed.message)
	// what was read stays on screen when a refresh fails, the error above it, as in the studio
	if (config.data !== undefined && catalogue.data !== undefined)
		return (
			<Panel
				config={config.data}
				catalogue={catalogue.data}
				error={error}
				readAt={Math.min(config.dataUpdatedAt, catalogue.dataUpdatedAt)}
			/>
		)
	if (error !== undefined) return <p role="alert">{error}</p>
	return <p>{extensionText.reading}</p>
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
	catalogue,
	error,
	readAt
}: {
	config: ApiOutputs['config']['get']
	catalogue: ApiOutputs['catalogue']['get']
	error: string | undefined
	readAt: number
}) => {
	useKnownRevision(catalogue.revision)
	const available = availableViewModes(config.capabilities)
	// the view as the person left it, when the page is drawn again — a reload of the editor or of the panel
	const [kept] = useState(keptView)
	const [mode, setMode] = useState<ViewMode>(
		usableViewMode(kept.mode ?? config.config.extension.defaultView, config.capabilities)
	)
	const source = useMemo(() => rowSourceOf(config), [config])
	const view = useTableView({
		catalogue: catalogue.catalogue,
		source,
		namespaced: config.namespaced,
		mode,
		restored: kept
	})
	useEffect(() => keepView({ mode, filter: view.filter, sort: view.sort }), [mode, view.filter, view.sort])
	const box = useRef<HTMLDivElement>(null)
	const scrolling = useRef(false)
	useLayoutEffect(() => {
		if (box.current !== null && kept.scroll !== undefined) box.current.scrollTop = kept.scroll
	}, [kept])
	const rules = useMemo(() => newKeyRulesOf(config), [config])
	const editKey = useEditKey()
	const addKey = useAddKey()
	const addNamespace = useAddNamespace()
	const renameNamespace = useRenameNamespace()
	const removeKeys = useRemoveKeys()
	const { setPinned } = view
	// a refresh shows the files as they are: rows held behind an earlier edit are let go
	useEffect(() => onRefresh(() => setPinned(undefined)), [setPinned])
	const {
		selection,
		choose,
		onSelect,
		onSelectAll,
		doomed,
		said,
		onEdit,
		added,
		onAdd,
		typing,
		namespaceAction,
		openNamespaceDialog,
		onRename,
		writeNamespace,
		namespaceClosed,
		addNamespaceButton,
		onDelete,
		deleteClosed,
		deleteButton
	} = useTableWrites({
		view,
		writes: { edit: editKey, add: addKey, addNamespace, renameNamespace, remove: removeKeys }
	})
	const [adding, setAdding] = useState(false)
	const addButton = useRef<HTMLButtonElement>(null)
	const [deleting, setDeleting] = useState(false)
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
				<Filters
					filter={view.filter}
					onChange={view.changeFilter}
					namespaces={view.namespaces}
					counts={view.counts}
					shown={view.visible.length}
					total={view.keys.length}
				/>
				<span id="selection-count" role="status" className="wrap-anywhere min-w-0 text-muted-foreground tabular-nums">
					{selectionStatus(selection.size, said)}
				</span>
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
					onTyping={typing}
					onClearFilters={() => view.changeFilter(noFilter)}
					onClose={() => {
						setAdding(false)
						addButton.current?.focus()
					}}
				/>
			)}
			{error !== undefined && (
				<p id="error" role="alert" className="shrink-0 px-2 py-1.5 font-semibold">
					{error}
				</p>
			)}
			<WriteNotice />
			<div
				ref={box}
				className="relative min-h-0 flex-1 scroll-pt-10 overflow-auto"
				onScroll={() => {
					// kept once a frame at most, however fast the person scrolls
					if (scrolling.current) return
					scrolling.current = true
					requestAnimationFrame(() => {
						scrolling.current = false
						if (box.current !== null) keepView({ scroll: box.current.scrollTop })
					})
				}}
			>
				{view.rows.length === 0 ? (
					<p id="empty" className="p-2 text-muted-foreground">
						{emptyViewText(view.filter)}
					</p>
				) : (
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
				)}
			</div>
			<Freshness readAt={readAt} />
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
					onClosed={deleted => {
						setDeleting(false)
						deleteClosed(deleted)
					}}
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
