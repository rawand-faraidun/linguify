import type { ReactNode } from 'react'
import { storageKeys, themes } from '@linguify/constants'
import type { Theme } from '@linguify/types'
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes'

/**
 * gives everything inside it the studio's colour theme
 *
 * @note a class, not a media query: shadcn's tokens switch on `dark` on the root element, which lets a
 * person's choice override the system's
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
export const useTheme = (): {
	theme: Theme
	resolvedTheme: Exclude<Theme, typeof themes.system>
	setTheme: (theme: Theme) => void
} => {
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
