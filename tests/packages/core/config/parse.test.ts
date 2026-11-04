import { ConfigError, parseConfig } from '@linguify/core'
import { describe, expect, it } from 'vitest'

/**
 * @returns `valid`, or each issue as `path: message`
 */
const problems = (input: unknown): string | string[] => {
	try {
		parseConfig(input)
		return 'valid'
	} catch (error) {
		expect(error).toBeInstanceOf(ConfigError)
		const issues = (error as ConfigError).details?.issues as { path: string; message: string }[]
		return issues.map(issue => `${issue.path}: ${issue.message}`)
	}
}

describe('parseConfig', () => {
	it('fills every default from {}, the engine options included', () => {
		expect(parseConfig({})).toEqual({
			path: './locales',
			locales: ['en'],
			default: 'en',
			engine: 'json',
			options: {
				fileStructure: 'single-file',
				namespaces: true,
				indentation: 2,
				indentationStyle: 'tab',
				finalNewline: true
			},
			sync: { removeUnused: false },
			keys: { fillWithDefault: false, createNamespace: false },
			studio: { port: 5678, open: true, defaultView: 'flat' },
			extension: { defaultView: 'flat' },
			io: { format: 'csv' },
			description: { enabled: false, name: '_desc.json' }
		})
	})

	it('accepts $schema and drops it', () => {
		expect('$schema' in parseConfig({ $schema: './node_modules/linguify/schema.json' })).toBe(false)
	})

	it('reads description as true, or as an object enabled by default', () => {
		expect(parseConfig({ description: true }).description).toEqual({ enabled: true, name: '_desc.json' })
		expect(parseConfig({ description: { name: 'notes.json' } }).description).toEqual({
			enabled: true,
			name: 'notes.json'
		})
	})

	it('keeps the other defaults of a section given in part', () => {
		expect(parseConfig({ studio: { port: 6000 } }).studio).toEqual({ port: 6000, open: true, defaultView: 'flat' })
	})

	it('never shares its defaults or the raw options between configs', () => {
		parseConfig({}).locales.push('ckb')
		expect(parseConfig({}).locales).toEqual(['en'])
		const raw = { indentation: 4 }
		expect(parseConfig({ options: raw }).options).not.toBe(raw)
	})

	it('takes English and Kurdish Sorani with ckb the default', () => {
		expect(problems({ locales: ['en', 'ckb'], default: 'ckb', options: { indentationStyle: 'tab' } })).toBe('valid')
	})

	it.each<[string, unknown, string[]]>([
		[
			'a default outside the locales',
			{ locales: ['en', 'ckb'], default: 'fr' },
			['default: `default` must be one of `locales` (en, ckb)']
		],
		['an option the engine lacks', { options: { sortKeys: true } }, ['options: Unrecognized key: "sortKeys"']],
		[
			'an engine option out of range',
			{ options: { indentation: 11 } },
			['options.indentation: Too big: expected number to be <=10']
		],
		['an unknown engine', { engine: 'yaml' }, ['engine: Unknown engine "yaml". Available: json']],
		[
			'v1 key names',
			{ localesPath: './public/locales', defaultLocale: 'en' },
			[': Unrecognized keys: "localesPath", "defaultLocale"']
		],
		[
			'a locale code with a slash',
			{ locales: ['en', '../ckb'] },
			['locales.1: A locale code may only contain letters, digits, `-` and `_` — `en`, `ckb`, `pt-BR`']
		],
		['no locales', { locales: [] }, ['locales: Too small: expected array to have >=1 items']],
		['a port out of range', { studio: { port: 70_000 } }, ['studio.port: Too big: expected number to be <=65535']],
		['a port as text', { studio: { port: '5678' } }, ['studio.port: Invalid input: expected number, received string']],
		[
			'an unknown view',
			{ studio: { defaultView: 'grid' } },
			['studio.defaultView: Invalid option: expected one of "flat"|"tree"']
		],
		['an unknown key in a section', { keys: { fill: true } }, ['keys: Unrecognized key: "fill"']],
		['a locale twice', { locales: ['en', 'en'] }, ['locales.1: `en` is listed twice']],
		[
			'locales differing only in case',
			{ locales: ['en', 'EN'] },
			['locales.1: `EN` and `en` differ only in case — on a case-insensitive file system they are the same file']
		],
		[
			'the config file as the descriptions file',
			{ description: { name: 'linguify.config.json' } },
			['description.name: Must not be `linguify.config.json`: writing descriptions would overwrite the config']
		],
		[
			'a locale clashing with the descriptions file',
			{ locales: ['en', '_desc'], description: true },
			['description: The descriptions file `_desc.json` would clash with the files of the locale `_desc`']
		],
		[
			'description of the wrong type',
			{ description: 'yes' },
			['description: Must be `true`, `false`, or `{ "enabled": true, "name": "_desc.json" }`']
		],
		['a typo inside description', { description: { enable: true } }, ['description: Unrecognized key: "enable"']],
		['options as an array', { options: [] }, ["options: Must be an object of the selected engine's settings"]],
		['options as null', { options: null }, ["options: Must be an object of the selected engine's settings"]],
		['the config as an array', [], [': Invalid input: expected object, received array']]
	])('refuses %s', (_, input, issues) => {
		expect(problems(input)).toEqual(issues)
	})

	it.each(['../../escape.json', 'notes/desc.json', 'notes\\desc.json', '..', '.'])(
		'refuses %j as the descriptions file',
		name => {
			expect(problems({ description: { name } })).toEqual([
				'description.name: Must be a plain file name inside `path`: no `/` or `\\`, and not `.` or `..`'
			])
		}
	)

	it('allows a locale named like the descriptions file while descriptions are off', () => {
		expect(problems({ locales: ['en', '_desc'] })).toBe('valid')
	})

	it('reports a `__proto__` key, at the root or in options, and pollutes nothing', () => {
		expect(problems(JSON.parse('{"options": {"__proto__": {"polluted": 1}}}'))).toEqual([
			'options: Unrecognized key: "__proto__"'
		])
		expect(problems(JSON.parse('{"__proto__": {"polluted": 1}}'))).toEqual([': Unrecognized key: "__proto__"'])
		expect(({} as Record<string, unknown>).polluted).toBeUndefined()
	})
})
