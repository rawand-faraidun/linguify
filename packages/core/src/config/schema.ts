import { parse } from 'node:path'
import {
	configDefaults,
	configFileName,
	descriptionDefaults,
	fileNamePattern,
	ioColumns,
	ioFormats,
	localeCodePattern,
	reservedKeySegments,
	studioPortRange,
	unprintableCharacter,
	viewModes
} from '@linguify/constants'
import type { Config, ConfigInput, EngineOptions } from '@linguify/types'
import { z } from 'zod'
import { findEngine, listEngines } from '../engine'
import type { Equal, Expect } from '../utils'

/**
 * a locale code, as it appears in `locales` and `default`
 */
const localeCode = z
	.string()
	.regex(localeCodePattern, 'A locale code may only contain letters, digits, `-` and `_` — `en`, `ckb`, `pt-BR`')
	.refine(code => !reservedKeySegments.includes(code), 'Not a locale code: this name is reserved')
	.refine(
		code => !Object.values<string>(ioColumns).includes(code),
		'Not a locale code: export and import name a column this'
	)

/**
 * the descriptions file settings in their object form
 */
const descriptionObject = z.strictObject({
	enabled: z
		.boolean()
		.default(descriptionDefaults.enabled)
		.describe('Whether descriptions are read and written. Off, any command passing one is rejected'),
	name: z
		.string()
		.regex(fileNamePattern, 'Must be a plain file name inside `path`: no `/` or `\\`, and not `.` or `..`')
		.refine(name => !unprintableCharacter.test(name), 'Must not contain a control character')
		.refine(
			name => name !== configFileName,
			`Must not be \`${configFileName}\`: writing descriptions would overwrite the config`
		)
		.default(descriptionDefaults.name)
		.describe('Filename inside `path`. Always JSON whatever the engine — descriptions are not translations')
})

const viewMode = z.enum(viewModes)

/**
 * the config's shape, before the engine's `options` and the cross-field rules are applied
 */
export const configObject = z.strictObject({
	$schema: z.string().optional().describe('The JSON Schema this file follows, for editor completion'),
	path: z
		.string()
		.min(1)
		.refine(path => !unprintableCharacter.test(path), 'Must not contain a control character')
		.default(configDefaults.path)
		.describe('Where the locale files live, relative to the config file'),
	locales: z
		.array(localeCode)
		.min(1)
		.superRefine((locales, context) => {
			const seen = new Map<string, string>()
			for (const [index, locale] of locales.entries()) {
				const first = seen.get(locale.toLowerCase())
				if (first === undefined) seen.set(locale.toLowerCase(), locale)
				else
					context.addIssue({
						code: 'custom',
						path: [index],
						message:
							first === locale
								? `\`${locale}\` is listed twice`
								: `\`${locale}\` and \`${first}\` differ only in case — on a case-insensitive file system they are the same file`,
						input: locale
					})
			}
		})
		.default(() => [...configDefaults.locales])
		.describe('Which locales exist'),
	default: localeCode
		.default(configDefaults.default)
		.describe(
			'The source of truth: `sync` copies from it, `diff` compares against it, the studio shows it first. Must be one of `locales`'
		),
	engine: z
		.string()
		.min(1)
		.default(configDefaults.engine)
		.describe('Which format reader and writer to use. Decides what `options` is validated against'),
	options: z
		.custom<EngineOptions>(
			value => typeof value === 'object' && value !== null && !Array.isArray(value),
			"Must be an object of the selected engine's settings"
		)
		.default(() => ({ ...configDefaults.options }))
		.describe("The selected engine's settings"),
	description: z
		.union([z.boolean(), descriptionObject], {
			error: 'Must be `true`, `false`, or `{ "enabled": true, "name": "_desc.json" }`'
		})
		.default(configDefaults.description)
		.describe(
			'Descriptions file: a flat map of key path to explanatory text, shown as a studio column. `true` is shorthand for `{ "enabled": true }`'
		),
	sync: z
		.strictObject({
			removeUnused: z
				.boolean()
				.default(configDefaults.sync.removeUnused)
				.describe('On `sync`, also delete keys other locales have that the default no longer does. Off, sync only adds')
		})
		.prefault({})
		.describe('`sync` settings'),
	keys: z
		.strictObject({
			fillWithDefault: z
				.boolean()
				.default(configDefaults.keys.fillWithDefault)
				.describe("New keys give untyped locales the default locale's text instead of an empty string"),
			createNamespace: z
				.boolean()
				.default(configDefaults.keys.createNamespace)
				.describe('A new key may name a namespace that does not exist; it is created as part of the write')
		})
		.prefault({})
		.describe('How new keys are created'),
	studio: z
		.strictObject({
			port: z
				.int()
				.min(studioPortRange.min)
				.max(studioPortRange.max)
				.default(configDefaults.studio.port)
				.describe('Port the studio binds'),
			open: z.boolean().default(configDefaults.studio.open).describe('Open a browser once the studio is listening'),
			defaultView: viewMode.default(configDefaults.studio.defaultView).describe('Table mode the studio starts in')
		})
		.prefault({})
		.describe('Studio settings'),
	extension: z
		.strictObject({
			defaultView: viewMode
				.default(configDefaults.extension.defaultView)
				.describe('Table mode the editor extension starts in')
		})
		.prefault({})
		.describe('Editor extension settings'),
	io: z
		.strictObject({
			format: z
				.enum(ioFormats)
				.default(configDefaults.io.format)
				.describe('Default `export` / `import` format. The file path is always a per-command flag, never config')
		})
		.prefault({})
		.describe('`export` / `import` settings')
})

/**
 * the whole config schema: the shape, then the rules that span fields
 *
 * @note `options` is checked against the **selected** engine only, so an option belonging to another
 * engine is an error rather than silently ignored; its parsed result, defaults included, replaces the
 * raw object
 */
export const configSchema = configObject.transform(({ $schema: _schema, description, ...config }, context) => {
	if (!config.locales.includes(config.default)) {
		context.issues.push({
			code: 'custom',
			path: ['default'],
			message: `\`default\` must be one of \`locales\` (${config.locales.join(', ')})`,
			input: config.default
		})
	}

	const resolved =
		typeof description === 'boolean' ? { enabled: description, name: descriptionDefaults.name } : description
	if (resolved.enabled) {
		const stem = parse(resolved.name).name.toLowerCase()
		const clash = config.locales.find(locale => locale.toLowerCase() === stem)
		if (clash !== undefined) {
			context.issues.push({
				code: 'custom',
				path: typeof description === 'boolean' ? ['description'] : ['description', 'name'],
				message: `The descriptions file \`${resolved.name}\` would clash with the files of the locale \`${clash}\``,
				input: resolved.name
			})
		}
	}

	const engine = findEngine(config.engine)
	let options: EngineOptions = config.options
	if (engine === undefined) {
		context.issues.push({
			code: 'custom',
			path: ['engine'],
			message: `Unknown engine "${config.engine}". Available: ${listEngines()
				.map(candidate => candidate.id)
				.join(', ')}`,
			input: config.engine
		})
	} else {
		const parsed = engine.options.safeParse(config.options)
		if (parsed.success) options = parsed.data
		else
			for (const issue of parsed.error.issues)
				context.issues.push({
					code: 'custom',
					path: ['options', ...issue.path],
					message: issue.message,
					input: issue.input
				})
	}

	return { ...config, options, description: resolved }
})

/**
 * compiles only while the schema produces exactly {@link Config}
 *
 * @note `Config` is written by hand in `@linguify/types` so browser code gets it without core; this
 * keeps the two from drifting in either direction
 */
export type ConfigSchemaMatchesConfig = Expect<Equal<z.output<typeof configSchema>, Config>>

/**
 * compiles only while the schema accepts exactly {@link ConfigInput}
 */
export type ConfigSchemaMatchesConfigInput = Expect<Equal<z.input<typeof configSchema>, ConfigInput>>
