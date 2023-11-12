import { Dispatch, SetStateAction } from 'react'
import { Config } from '../types/config'
import { Color, Theme } from '../types/Theme'

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
   * current theme color
   */
  currentTheme: Color

  /**
   * user config
   */
  config: Config | null
}
