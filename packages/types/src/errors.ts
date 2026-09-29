import type { errorCodes } from '@linguify/constants'
import type { Values } from './values'

/**
 * a code carried by every linguify error
 */
export type ErrorCode = Values<typeof errorCodes>
