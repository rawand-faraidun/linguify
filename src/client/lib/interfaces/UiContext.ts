import { Dispatch, SetStateAction } from 'react'
import { Theme } from '../types/Theme'

export interface UiContext {
  /**
   * theme color
   */
  theme: Theme

  /**
   * set theme color
   */
  setTheme: Dispatch<SetStateAction<Theme>>
}
