import { ConfigError, collectLeafPaths, resolveConfig } from '@linguify/core'
import { describe, expect, it } from 'vitest'

type Layers = Parameters<typeof resolveConfig>[0]

/**
 * @returns the value at a dotted path and the layer that set it
 */
const at = (layers: Layers, path: string) => {
	const { config, sources } = resolveConfig(layers)
	return [path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], config), sources[path]]
}

/**
 * @returns the error's details: the layer at fault, or `merged`, and each issue with the layers behind it
 */
const failure = (layers: Layers) => {
	try {
		resolveConfig(layers)
	} catch (error) {
		expect(error).toBeInstanceOf(ConfigError)
		const details = (error as ConfigError).details as {
			layer?: string
			issues: { path: string; message: string; layers?: string[] }[]
		}
		return {
			layer: details.layer ?? 'merged',
			issues: details.issues.map(issue => [`${issue.path}: ${issue.message}`, issue.layers ?? null])
		}
	}
	throw new Error('resolved')
}

describe('resolveConfig', () => {
	it('takes the flag over the project over the editor over the default', () => {
		expect(
			at(
				{ editor: { studio: { port: 6000 } }, project: { studio: { port: 6500 } }, flag: { studio: { port: 7000 } } },
				'studio.port'
			)
		).toEqual([7000, 'flag'])
		expect(at({ editor: { studio: { port: 6000 } }, project: { studio: { port: 6500 } } }, 'studio.port')).toEqual([
			6500,
			'project'
		])
		expect(at({ editor: { studio: { port: 6000 } } }, 'studio.port')).toEqual([6000, 'editor'])
		expect(at({}, 'studio.port')).toEqual([5678, 'default'])
	})

	it('lets one value of a section through without resetting its siblings', () => {
		const layers = { editor: { studio: { port: 6000 } }, project: { studio: { open: false } } }
		expect(at(layers, 'studio.port')).toEqual([6000, 'editor'])
		expect(at(layers, 'studio.open')).toEqual([false, 'project'])
		expect(at(layers, 'studio.defaultView')).toEqual(['flat', 'default'])
	})

	it('reads undefined in a layer as not set', () => {
		expect(
			at({ project: { studio: { port: 6500 } }, flag: { studio: { port: undefined, open: false } } }, 'studio.port')
		).toEqual([6500, 'project'])
	})

	it('replaces arrays whole', () => {
		expect(
			at({ project: { locales: ['en', 'ckb', 'de'], default: 'en' }, flag: { locales: ['en', 'ckb'] } }, 'locales')
		).toEqual([['en', 'ckb'], 'flag'])
	})

	it('merges the engine options field by field, each with its source', () => {
		const { config, sources } = resolveConfig({
			editor: { options: { indentation: 4 } },
			project: { options: { indentationStyle: 'space' } }
		})
		expect([config.options.indentation, config.options.indentationStyle]).toEqual([4, 'space'])
		expect([
			sources['options.indentation'],
			sources['options.indentationStyle'],
			sources['options.finalNewline']
		]).toEqual(['editor', 'project', 'default'])
	})

	it('keeps descriptions off when a stronger layer names only the file', () => {
		const { config, sources } = resolveConfig({
			project: { description: false },
			flag: { description: { name: 'notes.json' } }
		})
		expect(config.description).toEqual({ enabled: false, name: 'notes.json' })
		expect([sources['description.enabled'], sources['description.name']]).toEqual(['project', 'flag'])
	})

	it('gives a source for exactly every value of the config', () => {
		const { config, sources } = resolveConfig({ project: { locales: ['en', 'ckb'] } })
		expect(Object.keys(sources).sort()).toEqual(
			collectLeafPaths(config)
				.map(path => path.join('.'))
				.sort()
		)
		expect(Object.hasOwn(resolveConfig({ project: { $schema: './x.json' } }).sources, '$schema')).toBe(false)
	})

	it('never changes a layer', () => {
		const editor = { studio: { port: 6000 } }
		resolveConfig({ editor, flag: { studio: { open: false } } })
		expect(editor).toEqual({ studio: { port: 6000 } })
	})
})

describe('resolveConfig refusing', () => {
	it('names the layer whose own settings are malformed', () => {
		expect(failure({ editor: { studio: { port: 'x' } }, project: {} })).toEqual({
			layer: 'editor',
			issues: [['studio.port: Invalid input: expected number, received string', null]]
		})
		expect(failure({ flag: { prot: 7000 } })).toEqual({ layer: 'flag', issues: [[': Unrecognized key: "prot"', null]] })
	})

	it('reports a combination that only fails merged, naming the layer behind each value', () => {
		expect(failure({ editor: { default: 'ckb' }, project: { locales: ['en'] } })).toEqual({
			layer: 'merged',
			issues: [['default: `default` must be one of `locales` (en)', ['editor']]]
		})
		expect(failure({ project: {}, flag: { options: { indentation: 11 } } }).issues).toEqual([
			['options.indentation: Too big: expected number to be <=10', ['flag']]
		])
		expect(
			failure({ editor: { options: { sortKeys: true } }, project: { options: { indentation: 4 } } }).issues
		).toEqual([['options: Unrecognized key: "sortKeys"', ['editor', 'project']]])
		expect(failure({ project: { studio: { port: 6000 } }, flag: { locales: ['en'], default: 'ckb' } }).issues).toEqual([
			['default: `default` must be one of `locales` (en)', ['flag']]
		])
	})

	it('says the layer in its message', () => {
		expect(() => resolveConfig({ editor: { default: 'ckb' }, project: { locales: ['en'] } })).toThrow(
			'Invalid config:\n  default (from editor settings): `default` must be one of `locales` (en)'
		)
	})

	it('reports `__proto__` in options through the merge, polluting nothing', () => {
		expect(failure({ project: JSON.parse('{"options": {"__proto__": {"polluted": 1}}}') }).issues).toEqual([
			['options: Unrecognized key: "__proto__"', ['project']]
		])
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})
