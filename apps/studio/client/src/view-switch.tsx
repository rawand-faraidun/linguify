import { studioText, viewModeLabels, viewModes } from '@linguify/constants'
import { isViewMode } from '@linguify/table'
import type { ViewMode } from '@linguify/types'
import { ToggleGroup, ToggleGroupItem } from '@linguify/ui/components/toggle-group'
import { switchItemClass } from './classes'

/**
 * flat, tree or compact — a mode the project cannot use is shown, and disabled
 *
 * @param props - `mode`, the one shown; `available`, those the project can use; `onPick`
 *
 * @returns the switch
 */
export const ViewSwitch = ({
	mode,
	available,
	onPick
}: {
	mode: ViewMode
	available: readonly ViewMode[]
	onPick: (mode: ViewMode) => void
}) => (
	<ToggleGroup
		type="single"
		variant="outline"
		size="sm"
		spacing={0}
		aria-label={studioText.view}
		value={mode}
		onValueChange={value => {
			if (isViewMode(value)) onPick(value)
		}}
	>
		{Object.values(viewModes).map(name => (
			<ToggleGroupItem key={name} value={name} disabled={!available.includes(name)} className={switchItemClass}>
				{viewModeLabels[name]}
			</ToggleGroupItem>
		))}
	</ToggleGroup>
)
