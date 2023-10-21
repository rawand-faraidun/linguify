import { AppContext } from '../interfaces/AppContext'

/**
 * app default values
 */
export const appContextDefault: AppContext = {
  theme: 'system',
  currentTheme: 'dark',
  setTheme: () => {},
  config: null
}
