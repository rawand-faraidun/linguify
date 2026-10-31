import { settingScope, settingSeparator, settingsPrefix } from '@linguify/constants'
import { generateConfigJsonSchema, type JsonSchema } from './json-schema'

/**
 * one editor setting: the config option it sets, by its path, and its schema as the editor shows it
 */
export type EditorSetting = {
	/**
	 * the setting's key — `linguify.studio.port`
	 */
	key: string

	/**
	 * the option's path in the config — `['studio', 'port']`
	 */
	path: string[]

	/**
	 * the JSON Schema the editor validates and describes the setting with
	 */
	schema: JsonSchema
}

/**
 * one option's JSON Schema, with the parts the settings are read from
 */
type OptionSchema = JsonSchema & {
	properties?: Record<string, OptionSchema>
	anyOf?: OptionSchema[]
	description?: string
	default?: unknown
}

/**
 * the config's JSON Schema as {@link generateConfigJsonSchema} builds it: the options, and each engine's
 * options in an `if` / `then` branch
 */
type ConfigSchema = {
	properties: Record<string, OptionSchema>
	allOf: { then: { properties: { options: OptionSchema } } }[]
}

/**
 * every config option as an editor setting, from the config's JSON Schema — never written by hand
 *
 * @note an option that is a value or an object — `description: true` — is offered as the object's settings
 * without their defaults, which hold only once the object is written. Two engines giving one option two
 * schemas fail here: one setting cannot hold both
 *
 * @returns the settings, nested options flattened — `linguify.studio.port` — in the config's order
 *
 * @throws {@link Error} when two engines give the same option different schemas
 */
export const editorSettings = (): EditorSetting[] => {
	// the document is plain data to its type; this is the shape generateConfigJsonSchema gives it
	const schema = generateConfigJsonSchema() as ConfigSchema
	const { $schema: _own, options: _options, ...properties } = schema.properties
	const options = new Map<string, OptionSchema>()
	for (const branch of schema.allOf) {
		for (const [name, option] of Object.entries(branch.then.properties.options.properties ?? {})) {
			const known = options.get(name)
			if (known !== undefined && JSON.stringify(known) !== JSON.stringify(option))
				throw new Error(
					`Two engines give the option \`${name}\` different schemas; one editor setting cannot hold both`
				)
			options.set(name, option)
		}
	}
	return [...flatten(properties, []), ...flatten(Object.fromEntries(options), ['options'])]
}

/**
 * @param properties - an object's properties, by name
 * @param path - where the object is in the config
 * @param chosen - whether the object is one branch of a choice, so its defaults hold only once it is written
 *
 * @returns a setting for each leaf, objects walked into
 */
const flatten = (properties: Record<string, OptionSchema>, path: string[], chosen = false): EditorSetting[] =>
	Object.entries(properties).flatMap(([name, property]) => {
		const at = [...path, name]
		const object = property.properties ?? property.anyOf?.find(branch => branch.properties !== undefined)?.properties
		if (object !== undefined) return flatten(object, at, chosen || property.properties === undefined)
		const { description, default: initial, ...rest } = property
		return [
			{
				key: [settingsPrefix, ...at].join(settingSeparator),
				path: at,
				schema: {
					...rest,
					...(chosen || initial === undefined ? {} : { default: initial }),
					...(description === undefined ? {} : { markdownDescription: description }),
					scope: settingScope
				}
			}
		]
	})
