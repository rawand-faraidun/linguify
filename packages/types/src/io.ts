import type { ioFormats } from '@linguify/constants'
import type { Values } from './values'

/**
 * a file format `export` writes and `import` reads
 */
export type IoFormat = Values<typeof ioFormats>

/**
 * `export`'s input; both fields fall back — the format to `io.format`, the path to
 * `./translations.<format>`
 */
export type ExportInput = {
	format?: IoFormat
	path?: string
}

/**
 * `import`'s input; both fields fall back exactly as `export`'s do, so the two round-trip
 */
export type ImportInput = {
	format?: IoFormat
	path?: string
}
