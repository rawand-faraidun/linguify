import type { themes, viewModes } from '@linguify/constants'
import type { Values } from './values'

/**
 * a translation table layout
 */
export type ViewMode = Values<typeof viewModes>

/**
 * a studio colour theme
 */
export type Theme = Values<typeof themes>
