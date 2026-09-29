import type { EngineId, EngineOptions } from './engine'
import type { Locale } from './identifiers'
import type { IoFormat } from './io'
import type { ViewMode } from './ui'
import type { Optional } from './values'

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
