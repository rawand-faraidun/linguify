import { studioText } from '@linguify/constants'
import { ThemeSwitch } from './theme-switch'

/**
 * the bar over the table: the studio's name, and its controls at the end
 *
 * @returns the toolbar
 */
export const Toolbar = () => (
	<header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
		<h1 className="font-semibold text-sm">{studioText.title}</h1>
		<div className="ms-auto flex items-center gap-2">
			<ThemeSwitch />
		</div>
	</header>
)
