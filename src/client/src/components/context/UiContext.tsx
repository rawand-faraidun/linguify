import { useLocalStorage } from '@mantine/hooks'
import { createContext, useEffect } from 'react'
import { uiContextDefault } from '@lib/utils/uiContext'

/**
 * component props
 */
interface Props {
  children: React.ReactNode
}

/**
 * ui context
 */
export const UiContext = createContext(uiContextDefault)

/**
 * ui context provider
 *
 * @param props - component props
 *
 * @returns ui provider
 */
const UiProvider = ({ children }: Props) => {
  const [theme, setTheme] = useLocalStorage({ key: 'theme', defaultValue: uiContextDefault.theme })

  /**
   * listening to theme change
   */
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const query = window.matchMedia('(prefers-color-scheme: dark)')
      const systemTheme = query.matches ? 'dark' : 'light'
      root.classList.add(systemTheme)

      // change system theme handler
      const handleSystemThemeChange = () => {
        const systemChangeTheme = query.matches ? 'dark' : 'light'
        root.classList.add(systemChangeTheme)
      }
      // listening to system theme change
      query.addEventListener('change', handleSystemThemeChange)
      return () => query.removeEventListener('change', handleSystemThemeChange)
    }

    root.classList.add(theme!)
  }, [theme])

  /**
   * listening to system theme change
   */
  useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkQuery.addEventListener('change', () => {
      if (darkQuery.matches) {
        setTheme('dark')
      } else {
        setTheme('light')
      }
    })
  })

  return <UiContext.Provider value={{ theme: theme!, setTheme }}>{children}</UiContext.Provider>
}

export default UiProvider
