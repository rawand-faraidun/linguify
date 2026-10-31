import { useCallback, useMemo, useState } from 'react'
import { extensionText, studioText, tableOpenLimit, viewModeLabels, viewModes } from '@linguify/constants'
import { keyRows, namespacesIn } from '@linguify/keys'
import {
	availableViewModes,
	buildRows,
	collapsedExpansion,
	type Expansion,
	emptyNamespacesShown,
	expandedExpansion,
	noFilter,
	sectionsExpansion,
	toggleExpansion,
	usableViewMode
} from '@linguify/table'
import type { ViewMode } from '@linguify/types'
import { useQuery } from '@tanstack/react-query'
import { Grid } from './grid'
import { type ApiOutputs, useTRPC } from './trpc'

/**
 * the panel: the project's translations, read through the host, in the view the config names
 * (`extension.defaultView`), with every section open — or, above {@link tableOpenLimit} keys, closed, as in
 * the studio
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
 * the panel once the project is read: a toolbar, and below it the grid in a box of its own, which scrolls
 * under the toolbar with its head kept in sight
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
	const available = availableViewModes(config.capabilities)
	const [mode, setMode] = useState<ViewMode>(usableViewMode(config.config.extension.defaultView, config.capabilities))
	const source = useMemo(
		() => ({
			locales: config.config.locales,
			default: config.config.default,
			descriptions: config.config.description.enabled
		}),
		[config]
	)
	const keys = useMemo(() => keyRows(catalogue.catalogue, source), [catalogue, source])
	const namespaces = useMemo(
		() => (config.namespaced ? namespacesIn(catalogue.catalogue) : []),
		[catalogue, config.namespaced]
	)
	const rows = useMemo(
		() =>
			buildRows(mode, keys, {
				namespaced: config.namespaced,
				emptyNamespaces: emptyNamespacesShown(namespaces, keys, noFilter)
			}),
		[mode, keys, config.namespaced, namespaces]
	)
	const initial = useMemo(
		() =>
			keys.length > tableOpenLimit
				? collapsedExpansion
				: mode === viewModes.compact
					? sectionsExpansion(rows)
					: expandedExpansion,
		[keys, mode, rows]
	)
	const [expansions, setExpansions] = useState<Partial<Record<ViewMode, Expansion>>>({})
	const expansion = expansions[mode] ?? initial
	const expand = (next: Expansion) => setExpansions(current => ({ ...current, [mode]: next }))
	// the same function from one toggle to the next, so the rows a toggle leaves alone are not drawn again
	const onToggle = useCallback(
		(id: string) => setExpansions(current => ({ ...current, [mode]: toggleExpansion(current[mode] ?? initial, id) })),
		[mode, initial]
	)
	if (keys.length === 0 && namespaces.length === 0) return <p>{studioText.noKeys}</p>
	return (
		<div className="flex h-screen flex-col">
			<div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-1.5">
				<ViewSwitch mode={mode} available={available} onPick={setMode} />
				<button type="button" onClick={() => expand(expandedExpansion)} className={controlClass}>
					{studioText.expandAll}
				</button>
				<button type="button" onClick={() => expand(collapsedExpansion)} className={controlClass}>
					{studioText.collapseAll}
				</button>
			</div>
			<div className="relative min-h-0 flex-1 overflow-auto">
				<Grid rows={rows} mode={mode} source={source} expansion={expansion} onToggle={onToggle} />
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
