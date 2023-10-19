import { useLocalStorage } from '@mantine/hooks'
import { createContext, useEffect } from 'react'
import { appContextDefault } from '@lib/utils/appContext'

/**
 * component props
 */
interface Props {
  children: React.ReactNode
}

/**
 * app context
 */
export const AppContext = createContext(appContextDefault)

/**
 * ui context provider
 *
 * @param props - component props
 *
 * @returns app provider
 */
const AppProvider = ({ children }: Props) => {
  const [theme, setTheme] = useLocalStorage({ key: 'theme', defaultValue: appContextDefault.theme })

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

  return <AppContext.Provider value={{ theme: theme!, setTheme }}>{children}</AppContext.Provider>
}

export default AppProvider
