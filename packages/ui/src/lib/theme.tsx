import type { ReactNode } from 'react'
import { storageKeys, themes } from '@linguify/constants'
import type { Theme } from '@linguify/types'
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes'

/**
 * gives everything inside it the studio's colour theme
 *
 * @note the theme is a `dark` class on the root element — what shadcn's tokens switch on — and the
 * person's choice is remembered in the browser under `storageKeys.theme`; until they choose, it follows
 * the system, and switching never animates the whole page
 *
 * @param props - the content to theme
 *
 * @returns the provider
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => (
	<NextThemesProvider
		attribute="class"
		defaultTheme={themes.system}
		enableSystem
		storageKey={storageKeys.theme}
		themes={[themes.light, themes.dark]}
		disableTransitionOnChange
	>
		{children}
	</NextThemesProvider>
)

/**
 * the colour theme, and how to change it
 *
 * @returns `theme` — what the person picked, `system` until they pick; `resolvedTheme` — what is shown,
 * light or dark; `setTheme`
 */
export const useTheme = (): { theme: Theme; resolvedTheme: Theme; setTheme: (theme: Theme) => void } => {
	const { theme, resolvedTheme, setTheme } = useNextTheme()
	return {
		theme: isTheme(theme) ? theme : themes.system,
		resolvedTheme: resolvedTheme === themes.dark ? themes.dark : themes.light,
		setTheme
	}
}

/**
 * @param value - a theme name as stored
 *
 * @returns whether it is one of the studio's themes
 */
const isTheme = (value: string | undefined): value is Theme => Object.values(themes).some(theme => theme === value)
