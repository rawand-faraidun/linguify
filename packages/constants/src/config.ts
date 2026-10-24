import { appName } from './app'
import { defaultEngineId } from './engine'
import { defaultIoFormat } from './io'
import { studioDefaultPort } from './studio'
import { viewModes } from './ui'

/**
 * the files that mark a project's root and so end the config search — the same ones cosmiconfig's
 * `project` strategy stops at
 */
export const projectRootMarkers: readonly string[] = ['package.json', 'package.yaml']

/**
 * the config file's extension; `--config` must point at one, since a different extension would make
 * the loader run it as JavaScript or read it as YAML
 */
export const configFileExtension = '.json'

/**
 * the only config file name linguify reads
 */
export const configFileName = `${appName}.config${configFileExtension}`

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
 * how far up the config search goes: from the working directory up to the nearest `package.json`
 *
 * @note the config sits at its project's root — next to a Next.js app's `package.json` in a monorepo,
 * say. A project with no `package.json` at all is searched up to the filesystem root
 */
export const configSearchStrategy = 'project'

/**
 * top-level keys only a linguify 1.x config has — `localesPath`, `defaultLocale`, …
 *
 * @note when a rejected config contains any of them, the error points to the upgrade guide
 */
export const legacyConfigKeys: readonly string[] = ['localesPath', 'defaultLocale', 'useSingleFile', 'jsonIndentation']

/**
 * the generated JSON Schema's file name, shipped at the cli package root
 */
export const schemaFileName = 'schema.json'

/**
 * the folder a project's installed packages live in — where `init` looks for linguify's schema
 */
export const installedPackagesFolder = 'node_modules'

/**
 * the `$schema` `init` writes when linguify is not installed in the project
 *
 * @note when it is installed, `init` writes the path to the installed schema instead — relative to the
 * config, so a monorepo whose `node_modules` sits higher up still resolves it — which works offline and
 * matches the installed version. This one is pinned to the major version, so a later major's schema
 * never flags a valid config as wrong
 */
export const remoteSchema = `https://unpkg.com/${appName}@2/${schemaFileName}`

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

/**
 * where a config value can come from
 */
export const configLayers = {
	/**
	 * linguify's own default
	 */
	default: 'default',

	/**
	 * the editor's settings — `linguify.*` in VS Code
	 */
	editor: 'editor',

	/**
	 * the project's `linguify.config.json`
	 */
	project: 'project',

	/**
	 * a command-line flag
	 */
	flag: 'flag'
} as const

/**
 * the layers from weakest to strongest — a later layer's value wins
 */
export const configLayerOrder = [
	configLayers.default,
	configLayers.editor,
	configLayers.project,
	configLayers.flag
] as const

/**
 * how each layer is named to a person — in error messages, `linguify config` and the studio
 */
export const configLayerNames = {
	[configLayers.default]: 'defaults',
	[configLayers.editor]: 'editor settings',
	[configLayers.project]: 'project config',
	[configLayers.flag]: 'command-line flags'
} as const

/**
 * separates the segments of a config path — `studio.port`, `options.indentation` — in sources and
 * error messages
 */
export const configPathSeparator = '.'

/**
 * how the config's top level is named where a path would be empty, in error messages
 */
export const rootPathLabel = '(root)'

/**
 * the generated config JSON Schema's draft and title
 *
 * @note draft-07 rather than the newest draft: it is the one editors — VS Code's JSON support included
 * — implement most completely
 */
export const configJsonSchema = {
	draft: 'draft-07',
	draftUri: 'http://json-schema.org/draft-07/schema#',
	title: `${appName} config`
} as const
