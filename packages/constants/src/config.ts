import { appName } from './app'
import { defaultEngineId } from './engine'
import { defaultIoFormat } from './io'
import { studioDefaultPort } from './studio'
import { viewModes } from './ui'

/**
 * the only config file name linguify reads
 */
export const configFileName = `${appName}.config.json`

/**
 * the name cosmiconfig searches under
 */
export const configModuleName = appName

/**
 * where cosmiconfig looks, in each directory it visits
 *
 * @note deliberately one entry — there is exactly one config file, so `package.json` keys and rc
 * files are never searched
 */
export const configSearchPlaces = [configFileName] as const

/**
 * the generated JSON Schema's file name, shipped at the cli package root
 */
export const schemaFileName = 'schema.json'

/**
 * `$schema` values `init` writes into a new config
 *
 * @note `local` is preferred when linguify is installed in the project: it works offline and always
 * matches the installed version. `remote` is pinned to the major version, so a later major's schema
 * never flags a valid config as wrong
 */
export const schemaLocations = {
	local: `./node_modules/${appName}/${schemaFileName}`,
	remote: `https://unpkg.com/${appName}@2/${schemaFileName}`
} as const

/**
 * what a locale code may contain: letters, digits, `-` and `_` — `en`, `ckb`, `pt-BR`, `zh_Hant`
 *
 * @note a locale code becomes a file or folder name (`ckb.json`, `ckb/common.json`), so path
 * separators and dots must never get in
 */
export const localeCodePattern = /^[A-Za-z0-9_-]+$/

/**
 * the locale a new project starts with, and the default one
 */
const initialLocale = 'en'

/**
 * every config option's default, engine-neutral options only
 *
 * @note the selected engine's `options` defaults belong to that engine, in `core/src/engines`, so
 * adding an engine never touches this package
 */
export const configDefaults = {
	path: './locales',
	locales: [initialLocale],
	default: initialLocale,
	engine: defaultEngineId,
	options: {},
	description: false,
	sync: {
		removeUnused: false
	},
	keys: {
		fillWithDefault: false,
		createNamespace: false
	},
	studio: {
		port: studioDefaultPort,
		open: true,
		defaultView: viewModes.flat
	},
	extension: {
		defaultView: viewModes.flat
	},
	io: {
		format: defaultIoFormat
	}
} as const

/**
 * what `description: true` expands to, and the defaults of its object form
 */
export const descriptionDefaults = {
	enabled: true,
	name: '_desc.json'
} as const
