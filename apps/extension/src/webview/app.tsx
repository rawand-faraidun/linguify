import { useCallback, useMemo, useState } from 'react'
import { extensionText, studioText, viewModeLabels, viewModes } from '@linguify/constants'
import type { RowSource } from '@linguify/keys'
import {
	availableViewModes,
	collapsedExpansion,
	expandedExpansion,
	type KeyEdit,
	usableViewMode
} from '@linguify/table'
import { useKnownRevision, useTableView } from '@linguify/table/react'
import type { ViewMode } from '@linguify/types'
import { useQuery } from '@tanstack/react-query'
import { Filters } from './filters'
import { Grid } from './grid'
import { WriteNotice } from './notice'
import { type ApiOutputs, useTRPC } from './trpc'
import { useEditKey } from './writes'

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
	const editKey = useEditKey()
	const { pin } = view
	const onEdit = useCallback(
		(edit: KeyEdit) => {
			pin()
			return editKey(edit)
		},
		[pin, editKey]
	)
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
				<button type="button" onClick={() => view.expand(expandedExpansion)} className={controlClass}>
					{studioText.expandAll}
				</button>
				<button type="button" onClick={() => view.expand(collapsedExpansion)} className={controlClass}>
					{studioText.collapseAll}
				</button>
				<Filters
					filter={view.filter}
					onChange={view.changeFilter}
					namespaces={view.namespaces}
					counts={view.counts}
					shown={view.visible.length}
					total={view.keys.length}
				/>
			</div>
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
				/>
			</div>
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
