import { editorSettings, generateConfigJsonSchema, type JsonSchema, parseConfig } from '@linguify/core'
import { describe, expect, it } from 'vitest'

type Node = JsonSchema & { properties?: Record<string, Node>; description?: string; anyOf?: Node[] }

const schema = generateConfigJsonSchema() as Node & {
	allOf: { if: { properties: { engine: { const: string } } }; then: { properties: { options: Node } } }[]
}

/**
 * @returns the dotted path of every property, at any depth, that has no description
 */
const undescribed = (properties: Record<string, Node>, prefix = ''): string[] =>
	Object.entries(properties).flatMap(([name, property]) => [
		...(property.description === undefined ? [`${prefix}${name}`] : []),
		...undescribed(
			property.properties ?? property.anyOf?.find(branch => branch.properties !== undefined)?.properties ?? {},
			`${prefix}${name}.`
		)
	])

describe('generateConfigJsonSchema', () => {
	it('is published at the address init writes, closed to unknown keys', () => {
		expect(schema.$id).toBe('https://unpkg.com/linguify@2/schema.json')
		expect(schema.additionalProperties).toBe(false)
		expect(Object.keys(schema.properties ?? {})).toEqual([
			'$schema',
			'path',
			'locales',
			'default',
			'engine',
			'options',
			'description',
			'sync',
			'keys',
			'studio',
			'extension',
			'io'
		])
	})

	it('validates `options` against the engine named, the json engine by default', () => {
		expect(schema.properties?.engine).toMatchObject({ default: 'json', enum: ['json'] })
		const [json] = schema.allOf
		expect(json?.if.properties.engine.const).toBe('json')
		expect(Object.keys(json?.then.properties.options.properties ?? {})).toEqual([
			'fileStructure',
			'namespaces',
			'indentation',
			'indentationStyle',
			'finalNewline'
		])
	})

	it('describes every value, for an editor to show', () => {
		expect(undescribed(schema.properties ?? {})).toEqual([])
		expect(undescribed(schema.allOf[0]?.then.properties.options.properties ?? {})).toEqual([])
	})
})

describe('editorSettings', () => {
	const settings = editorSettings()

	it('gives one setting per config value, under linguify.', () => {
		expect(settings.map(setting => setting.key)).toEqual([
			'linguify.path',
			'linguify.locales',
			'linguify.default',
			'linguify.engine',
			'linguify.description.enabled',
			'linguify.description.name',
			'linguify.sync.removeUnused',
			'linguify.keys.fillWithDefault',
			'linguify.keys.createNamespace',
			'linguify.studio.port',
			'linguify.studio.open',
			'linguify.studio.defaultView',
			'linguify.extension.defaultView',
			'linguify.io.format',
			'linguify.options.fileStructure',
			'linguify.options.namespaces',
			'linguify.options.indentation',
			'linguify.options.indentationStyle',
			'linguify.options.finalNewline'
		])
	})

	it('keeps each value its schema, default and description, per folder', () => {
		expect(settings.find(setting => setting.key === 'linguify.studio.port')).toEqual({
			key: 'linguify.studio.port',
			path: ['studio', 'port'],
			schema: {
				type: 'integer',
				minimum: 1,
				maximum: 65535,
				default: 5678,
				markdownDescription: 'Port the studio binds',
				scope: 'resource'
			}
		})
	})

	it("gives no default to a value of description's object form, which `true` alone could set", () => {
		expect(settings.find(setting => setting.key === 'linguify.description.enabled')?.schema.default).toBeUndefined()
	})

	it('has a default equal to the config parsed from {}', () => {
		const defaults = parseConfig({}) as unknown as Record<string, Record<string, unknown>>
		for (const { path, schema: setting } of settings) {
			if (!('default' in setting)) continue
			const [section = '', name] = path
			expect(name === undefined ? defaults[section] : defaults[section]?.[name]).toEqual(setting.default)
		}
	})
})
