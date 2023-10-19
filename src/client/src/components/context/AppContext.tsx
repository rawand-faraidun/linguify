import { useLocalStorage } from '@mantine/hooks'
import { createContext, useEffect, useState } from 'react'
import request from '@lib/functions/request'
import { GetApi } from '@lib/interfaces/api/Api'
import { Config } from '@lib/types/config'
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
  const [config, setConfig] = useState<(typeof appContextDefault)['config']>(null)

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
  }, [])

  /**
   * getting linguify config
   */
  useEffect(() => {
    request<GetApi<Config>>('/config', { method: 'GET' })
      .then(({ data: { data } }) => {
        // checking if locales include default locale
        if (!data.locales.includes(data.defaultLocale)) throw new Error('Config locales does not include default locale')

        // reordering locales
        data.locales.splice(data.locales.indexOf(data.defaultLocale), 1)
        data.locales.sort()
        data.locales.unshift(data.defaultLocale)

        setConfig(data)
      })
      .catch(error => console.error(error))
  }, [])

  return <AppContext.Provider value={{ theme: theme!, setTheme, config }}>{children}</AppContext.Provider>
}

export default AppProvider
