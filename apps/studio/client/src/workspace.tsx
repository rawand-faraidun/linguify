import { memo, useCallback, useMemo, useState } from 'react'
import { studioText, viewModes } from '@linguify/constants'
import {
	availableViewModes,
	buildRows,
	collapsedExpansion,
	type Expansion,
	expandedExpansion,
	type RowSource,
	rowsFromCatalogue,
	sectionsExpansion,
	toggleExpansion
} from '@linguify/table'
import type { ViewMode } from '@linguify/types'
import { Button } from '@linguify/ui/components/button'
import { ListChevronsDownUpIcon, ListChevronsUpDownIcon } from 'lucide-react'
import { focusRingClass } from './classes'
import { Toolbar } from './toolbar'
import { TranslationTable } from './translation-table'
import type { ApiOutputs } from './trpc'
import { useViewMode } from './use-view-mode'
import { ViewSwitch } from './view-switch'

/**
 * the project, once read: the toolbar with the view's controls, and the table
 *
 * @note each view mode keeps its own expansion, so switching modes and back finds rows as they were; the
 * compact view starts with its sections open and its keys closed. The keys are read from the catalogue
 * once, whatever the view, and a refresh that changed nothing renders nothing again
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
		const rows = useMemo(
			() => buildRows(mode, keys, { namespaced: config.namespaced }),
			[mode, keys, config.namespaced]
		)
		const initial = useMemo(
			() => (mode === viewModes.compact ? sectionsExpansion(rows) : expandedExpansion),
			[mode, rows]
		)
		const [expansions, setExpansions] = useState<Partial<Record<ViewMode, Expansion>>>({})
		const expansion = expansions[mode] ?? initial
		const expand = (next: Expansion) => setExpansions(current => ({ ...current, [mode]: next }))
		const toggle = useCallback(
			(id: string) => setExpansions(current => ({ ...current, [mode]: toggleExpansion(current[mode] ?? initial, id) })),
			[mode, initial]
		)
		return (
			<>
				<Toolbar>
					<ViewSwitch mode={mode} available={availableViewModes(config.capabilities)} onPick={pick} />
					<Button variant="ghost" size="sm" className={focusRingClass} onClick={() => expand(expandedExpansion)}>
						<ListChevronsUpDownIcon data-icon="inline-start" />
						{studioText.expandAll}
					</Button>
					<Button variant="ghost" size="sm" className={focusRingClass} onClick={() => expand(collapsedExpansion)}>
						<ListChevronsDownUpIcon data-icon="inline-start" />
						{studioText.collapseAll}
					</Button>
				</Toolbar>
				<main className="flex min-h-0 flex-1 flex-col overflow-auto">
					{error !== undefined && (
						<p id="error" role="alert" className="p-4 text-destructive">
							{error}
						</p>
					)}
					{rows.length === 0 ? (
						<p className="p-4 text-muted-foreground">{studioText.noKeys}</p>
					) : (
						<TranslationTable rows={rows} mode={mode} source={source} expansion={expansion} onToggle={toggle} />
					)}
				</main>
			</>
		)
	}
)
