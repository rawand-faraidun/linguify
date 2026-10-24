import { configJsonSchema, defaultEngineId, remoteSchema } from '@linguify/constants'
import { z } from 'zod'
import { listEngines } from '../engine'
import { configObject } from './schema'

/**
 * a JSON Schema document, as plain data
 */
type JsonSchema = Record<string, unknown>

/**
 * generates the config's JSON Schema, for `$schema` completion and validation in editors
 *
 * @note everything comes from the zod schema; nothing is written by hand. `options` is filled in per
 * registered engine with `if` / `then`, so choosing an engine makes `options` complete to that
 * engine's keys and nothing else
 *
 * @returns the schema document, ready to be written as JSON
 */
export const generateConfigJsonSchema = (): JsonSchema => {
	const base = toJsonSchema(configObject)
	const properties = base.properties as Record<string, JsonSchema>
	const engines = listEngines()

	return {
		$schema: configJsonSchema.draftUri,
		$id: remoteSchema,
		title: configJsonSchema.title,
		...base,
		properties: {
			...properties,
			engine: { ...properties.engine, enum: engines.map(engine => engine.id) },
			options: { type: 'object', description: properties.options?.description }
		},
		allOf: engines.map(engine => ({
			if: {
				properties: { engine: { const: engine.id } },
				...(engine.id === defaultEngineId ? {} : { required: ['engine'] })
			},
			// biome-ignore lint/suspicious/noThenProperty: `then` is the JSON Schema keyword; this is plain data, never awaited
			then: { properties: { options: toJsonSchema(engine.options) } }
		}))
	}
}

/**
 * converts one zod schema to JSON Schema, describing what a user may *write*
 *
 * @note `io: 'input'` makes defaulted fields optional — the output view would mark them required and
 * flag a minimal config as wrong. `unrepresentable: 'any'` lets the `options` check, which JSON Schema
 * cannot express, through as an open placeholder that the engine branches then fill
 *
 * @param schema - the zod schema
 *
 * @returns its JSON Schema, without a `$schema` of its own
 */
const toJsonSchema = (schema: z.ZodType): JsonSchema => {
	const { $schema: _draft, ...rest } = z.toJSONSchema(schema, {
		target: configJsonSchema.draft,
		io: 'input',
		unrepresentable: 'any'
	})
	return rest
}
