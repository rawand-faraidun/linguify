import type { EngineCapabilities, EngineId, EngineOptions, Locale, TranslationTree } from '@linguify/types'
import type { z } from 'zod'

/**
 * what an engine is told when it reads or writes a project's translation files
 */
export type EngineContext = {
	/**
	 * the locales folder's absolute path
	 */
	directory: string

	/**
	 * every configured locale, in config order
	 */
	locales: Locale[]

	/**
	 * the engine's options, already validated against its own schema
	 */
	options: EngineOptions
}

/**
 * one file as an engine found it — what a revision is computed from
 */
export type FileSnapshot = {
	/**
	 * the file's absolute path
	 */
	path: string

	/**
	 * its text exactly as stored, or `null` when the file does not exist
	 */
	content: string | null
}

/**
 * one file's complete content, as an engine would write it
 */
export type FileContent = {
	/**
	 * the file's absolute path
	 */
	path: string
	content: string
}

/**
 * what an engine read
 */
export type EngineReading = {
	/**
	 * every configured locale's tree, in config order
	 */
	locales: Record<Locale, TranslationTree>

	/**
	 * every file the engine looked at, present or not
	 */
	files: FileSnapshot[]
}

/**
 * a format linguify can read and write translation files in
 */
export type Engine = {
	id: EngineId

	/**
	 * what the format can express; operations and every surface consult these instead of branching on
	 * an engine's id
	 */
	capabilities: EngineCapabilities

	/**
	 * the engine's `options` schema — a strict object whose every field is described and defaulted;
	 * {@link registerEngine} refuses any engine that breaks this
	 */
	options: z.ZodObject

	/**
	 * whether the first segment of every key path is a namespace under the given options
	 *
	 * @note operations and every surface ask this instead of reading an engine's own options
	 */
	namespaced: (options: EngineOptions) => boolean

	/**
	 * reads every configured locale
	 *
	 * @note a locale whose files do not exist yet reads as empty — `init` and `sync` create them
	 *
	 * @throws `EngineError` `FILE_INVALID` for a file that cannot be read (read it with {@link readSnapshot})
	 * or the format cannot parse, `INVALID_STRUCTURE` for one that parses but is not a translation tree
	 */
	read: (context: EngineContext) => Promise<EngineReading>

	/**
	 * turns every locale's tree into the files that hold it, without touching the disk
	 *
	 * @note the result is the complete set of files — comparing it with what was read tells which to
	 * write and which to delete
	 *
	 * @throws `EngineError` `INVALID_STRUCTURE` for a tree the format cannot hold
	 */
	serialize: (context: EngineContext, locales: Record<Locale, TranslationTree>) => FileContent[]
}
