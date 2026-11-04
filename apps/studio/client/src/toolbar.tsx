import type { ReactNode } from 'react'
import { studioText } from '@linguify/constants'
import logoText from '../../../../assets/logo-text.svg?raw'
import { ThemeSwitch } from './theme-switch'

/**
 * the logo, as the repo's shared file draws it — its word in the page's own text colour, so it reads on
 * light and dark alike, the puzzle in its own colours
 */
const logo = logoText
	.trim()
	.replace(/>\s+</g, '><')
	.replace(/<path (?![^>]*\bfill=)/g, '<path fill="currentColor" ')

/**
 * the bar over the table: the studio's logo, the view's controls, and the theme at the end
 *
 * @param props - `children`, the view's controls, once the project is read
 *
 * @returns the toolbar
 */
export const Toolbar = ({ children }: { children?: ReactNode }) => (
	<header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
		<h1 className="me-2 flex items-center">
			<span
				aria-hidden="true"
				className="block h-6 [&>svg]:h-full [&>svg]:w-auto"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: the repo's own logo, read when the studio is built
				dangerouslySetInnerHTML={{ __html: logo }}
			/>
			<span className="sr-only">{studioText.title}</span>
		</h1>
		<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
		<div className="ms-auto flex items-center gap-2">
			<ThemeSwitch />
		</div>
	</header>
)
