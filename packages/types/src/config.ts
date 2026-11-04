import type { configLayers } from '@linguify/constants'
import type { EngineId, EngineOptions } from './engine'
import type { Locale } from './identifiers'
import type { IoFormat } from './io'
import type { ViewMode } from './ui'
import type { Optional, Values } from './values'

/**
 * the descriptions file's settings, after `true` / `false` has been expanded
 */
export type DescriptionConfig = {
	enabled: boolean
	name: string
}

/**
 * `sync` settings
 */
export type SyncConfig = {
	removeUnused: boolean
}

/**
 * how new keys are created
 */
export type KeysConfig = {
	fillWithDefault: boolean
	createNamespace: boolean
}

/**
 * studio settings
 */
export type StudioConfig = {
	port: number
	open: boolean
	defaultView: ViewMode
}

/**
 * editor extension settings
 */
export type ExtensionConfig = {
	defaultView: ViewMode
}

/**
 * `export` / `import` settings
 */
export type IoConfig = {
	format: IoFormat
}

/**
 * the fully resolved config: every layer merged and every default applied
 *
 * @note written by hand so browser code gets it without core; core asserts at compile time that its
 * zod schema produces exactly this type, so the two cannot drift
 */
export type Config = {
	path: string
	locales: Locale[]
	default: Locale
	engine: EngineId
	options: EngineOptions
	description: DescriptionConfig
	sync: SyncConfig
	keys: KeysConfig
	studio: StudioConfig
	extension: ExtensionConfig
	io: IoConfig
}

/**
 * what a config file, an editor settings block or a set of flags may contain — every field optional
 *
 * @note checked against the zod schema's input type the same way as {@link Config}
 */
export type ConfigInput = {
	$schema?: string | undefined
	path?: string | undefined
	locales?: Locale[] | undefined
	default?: Locale | undefined
	engine?: EngineId | undefined
	options?: EngineOptions | undefined
	description?: boolean | Optional<DescriptionConfig> | undefined
	sync?: Optional<SyncConfig> | undefined
	keys?: Optional<KeysConfig> | undefined
	studio?: Optional<StudioConfig> | undefined
	extension?: Optional<ExtensionConfig> | undefined
	io?: Optional<IoConfig> | undefined
}

/**
 * where a config value came from
 */
export type ConfigLayer = Values<typeof configLayers>

/**
 * the layer each config value came from, by its dotted path — `studio.port` → `flag`
 */
export type ConfigSources = Record<string, ConfigLayer>

/**
 * the config layers a caller can supply; each holds whatever that source contained, unchecked
 *
 * @note defaults are not a layer the caller passes; they are the weakest, filling in every value no
 * layer set
 */
export type ConfigLayerInputs = {
	editor?: unknown
	project?: unknown
	flag?: unknown
}

/**
 * a resolved config, with the layer every value came from
 */
export type ResolvedConfig = {
	config: Config
	sources: ConfigSources
}

/**
 * a resolved config, with where its file was found
 */
export type LoadedConfig = ResolvedConfig & {
	/**
	 * the config file's absolute path
	 */
	file: string

	/**
	 * the folder holding the config file; every relative path in the config is resolved from here
	 */
	root: string

	/**
	 * the locales folder's absolute path — `path`, resolved from `root`
	 */
	localesDirectory: string
}
