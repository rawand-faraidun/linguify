import { Dispatch, SetStateAction } from 'react'
import { Config } from '../types/config'
import { Theme } from '../types/Theme'

/**
 * app props
 */
export interface AppContext {
  /**
   * theme color
   */
  theme: Theme

  /**
   * set theme color
   */
  setTheme: Dispatch<SetStateAction<Theme>>

  /**
   * user config
   */
  config: Config | null
}
