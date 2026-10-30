import type { changeKinds, projectActions, warningCodes } from '@linguify/constants'
import type { Values } from './values'

/**
 * what an operation did to a key
 */
export type ChangeKind = Values<typeof changeKinds>

/**
 * a code carried by every warning
 */
export type WarningCode = Values<typeof warningCodes>

/**
 * a whole-project action — sync, format, import, export
 */
export type ProjectAction = Values<typeof projectActions>
