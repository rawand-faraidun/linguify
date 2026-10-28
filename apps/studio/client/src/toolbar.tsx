import type { ReactNode } from 'react'
import { studioText } from '@linguify/constants'
import { ThemeSwitch } from './theme-switch'

/**
 * the bar over the table: the studio's name, the view's controls, and the theme at the end
 *
 * @param props - `children`, the view's controls, once the project is read
 *
 * @returns the toolbar
 */
export const Toolbar = ({ children }: { children?: ReactNode }) => (
	<header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
		<h1 className="me-2 font-semibold text-sm">{studioText.title}</h1>
		{children}
		<div className="ms-auto flex items-center gap-2">
			<ThemeSwitch />
		</div>
	</header>
)
