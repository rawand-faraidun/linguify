import { configPathSeparator, engineIdPattern, errorCodes, rootPathLabel } from '@linguify/constants'
import type { EngineId } from '@linguify/types'
import { EngineError, UnexpectedError } from '../errors'
import type { Engine } from './types'

const engines = new Map<EngineId, Engine>()

/**
 * adds an engine to the registry; each engine calls this once, from its own folder
 *
 * @param engine - the engine to add
 */
export const registerEngine = (engine: Engine): void => {
	const problem = findEngineProblem(engine)
	if (problem !== undefined) {
		throw new UnexpectedError(`Engine "${engine.id}" cannot be registered: ${problem}`, {
			code: errorCodes.unexpected,
			details: { engine: engine.id, problem }
		})
	}
	engines.set(engine.id, engine)
}

/**
 * checks the contract every engine must keep before it is registered
 *
 * @note a config that names an engine but sets none of its options must still be valid, so every
 * option needs a default; an option from another engine must be an error, so the object must be
 * strict; every option becomes `schema.json` and editor-settings text, so each needs a description
 *
 * @param engine - the engine about to be registered
 *
 * @returns what is wrong, or `undefined` when the engine is sound
 */
const findEngineProblem = (engine: Engine): string | undefined => {
	if (!engineIdPattern.test(engine.id))
		return 'its id must be lowercase letters, digits and `-`, starting with a letter'
	if (engines.has(engine.id)) return 'an engine with this id is already registered'
	if (engine.capabilities.fileStructures.length === 0) return 'it supports no file structure'
	if (engine.options._zod.def.catchall?._zod.def.type !== 'never') {
		return 'its options must be a strict object, so an option from another engine is an error'
	}
	const undescribed = Object.entries(engine.options.shape)
		.filter(([, field]) => !(field as { description?: string }).description)
		.map(([name]) => name)
	if (undescribed.length > 0) return `every option needs a description, and these have none: ${undescribed.join(', ')}`
	const empty = engine.options.safeParse({})
	if (!empty.success) {
		const fields = empty.error.issues.map(issue => issue.path.map(String).join(configPathSeparator) || rootPathLabel)
		return `every option needs a default, and these have none: ${fields.join(', ')}`
	}
	return undefined
}

/**
 * finds a registered engine without failing
 *
 * @param id - the engine's id
 *
 * @returns the engine, or `undefined` when none has that id
 */
export const findEngine = (id: EngineId): Engine | undefined => engines.get(id)

/**
 * finds a registered engine
 *
 * @param id - the engine's id
 *
 * @returns the engine
 *
 * @throws {@link EngineError} `ENGINE_UNKNOWN` when no engine has that id
 */
export const getEngine = (id: EngineId): Engine => {
	const engine = findEngine(id)
	if (engine === undefined) {
		throw new EngineError(`Unknown engine "${id}". Available: ${[...engines.keys()].join(', ')}`, {
			code: errorCodes.engineUnknown,
			details: { engine: id, available: [...engines.keys()] }
		})
	}
	return engine
}

/**
 * @returns every registered engine, in registration order
 */
export const listEngines = (): Engine[] => [...engines.values()]
