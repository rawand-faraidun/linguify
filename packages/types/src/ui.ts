import type { tableMarks, themes, viewModes } from '@linguify/constants'
import type { Values } from './values'

/**
 * a translation table layout
 */
export type ViewMode = Values<typeof viewModes>

/**
 * a studio colour theme
 */
export type Theme = Values<typeof themes>

/**
 * how a translation table marks one key's text in one locale
 */
export type TableMark = Values<typeof tableMarks>
