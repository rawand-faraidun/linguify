import { Dispatch, SetStateAction } from 'react'
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
}
