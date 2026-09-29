import type { fileStructures, indentationStyles } from '@linguify/constants'
import type { Values } from './values'

/**
 * a registered engine's id
 *
 * @note a plain string rather than a union: engines register themselves, so the set is only known
 * at runtime, and the config schema checks it against the registry
 */
export type EngineId = string

/**
 * how an engine lays out a locale on disk
 */
export type FileStructure = Values<typeof fileStructures>

/**
 * the character a written file is indented with
 */
export type IndentationStyle = Values<typeof indentationStyles>

/**
 * what a format can express; operations and every surface consult these instead of branching on a
 * specific engine
 */
export type EngineCapabilities = {
	/**
	 * whether keys can nest; `false` turns off tree view and deep key paths everywhere
	 */
	nesting: boolean

	/**
	 * whether the first path segment can be a namespace
	 */
	namespaces: boolean

	/**
	 * the file structures the engine can read and write
	 */
	fileStructures: readonly FileStructure[]
}

/**
 * the selected engine's settings; each engine validates its own shape
 */
export type EngineOptions = Record<string, unknown>
