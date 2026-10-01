import type { EngineCapabilities, EngineId } from '@linguify/types'
import type { z } from 'zod'

/**
 * a format linguify can read and write translation files in
 *
 * @note only the declaration so far; reading and writing join it with the engine IO
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
}
