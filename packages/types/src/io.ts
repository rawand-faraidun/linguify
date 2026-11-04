import type { ioFormats } from '@linguify/constants'
import type { Values } from './values'

/**
 * a file format `export` writes and `import` reads
 */
export type IoFormat = Values<typeof ioFormats>
