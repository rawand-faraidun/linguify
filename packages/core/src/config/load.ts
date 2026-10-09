import { access } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import {
	configFileExtension,
	configFileName,
	configModuleName,
	configSearchPlaces,
	configSearchStrategy,
	errorCodes,
	fileErrorCodes,
	legacyConfigKeys,
	projectRootMarkers
} from '@linguify/constants'
import type { LoadedConfig } from '@linguify/types'
import { cosmiconfig, type Loader } from 'cosmiconfig'
import { ConfigError } from '../errors'
import { isPlainObject, stripByteOrderMark } from '../utils'
import { resolveConfig } from './layers'

/**
 * where to find the project config, and the layers around it
 */
export type LoadConfigOptions = {
	/**
	 * where the search starts, and what a relative `config` is resolved against — `--cwd`
	 */
	cwd: string

	/**
	 * a config file to load instead of searching — `--config`
	 */
	config?: string | undefined

	/**
	 * the editor settings layer
	 */
	editor?: unknown

	/**
	 * the command-line flags layer
	 */
	flag?: unknown
}

/**
 * finds the project config and resolves it with the editor and flag layers
 *
 * @param options - where to look, and the other layers
 *
 * @returns the resolved config, the layer every value came from, and where the file is
 *
 * @throws {@link ConfigError} `CONFIG_NOT_FOUND` when there is no config file, `CONFIG_INVALID` when it
 * is not valid JSON, is empty, or fails the schema
 */
export const loadConfig = async ({ cwd, config, editor, flag }: LoadConfigOptions): Promise<LoadedConfig> => {
	const { file, content } = await readProjectConfig(resolve(cwd), config)
	const resolved = withLegacyHint(() => resolveConfig({ editor, project: content, flag }), content)
	const root = dirname(file)
	return { ...resolved, file, root, localesDirectory: resolve(root, resolved.config.path) }
}

/**
 * finds and reads the project config file
 *
 * @note the search runs from `cwd` up to the nearest `package.json` or `package.yaml` — the project's
 * root — or to the filesystem root when there is none
 *
 * @param cwd - absolute folder to start from
 * @param config - an explicit file, relative to `cwd`
 *
 * @returns the file's absolute path and its parsed JSON
 */
const readProjectConfig = async (
	cwd: string,
	config: string | undefined
): Promise<{ file: string; content: unknown }> => {
	if (config !== undefined && extname(config) !== configFileExtension) {
		throw new ConfigError(`The config file must be a ${configFileExtension} file: ${config}`, {
			code: errorCodes.configInvalid,
			details: { file: resolve(cwd, config) }
		})
	}

	const explorer = cosmiconfig(configModuleName, {
		searchPlaces: [...configSearchPlaces],
		searchStrategy: configSearchStrategy,
		loaders: { [configFileExtension]: loadJson },
		ignoreEmptySearchPlaces: false,
		cache: false
	})

	try {
		const result = config === undefined ? await explorer.search(cwd) : await explorer.load(resolve(cwd, config))
		if (result === null) {
			const unreadable = await findUnreadableConfig(cwd)
			if (unreadable !== undefined) throw cannotRead(unreadable)
			throw new ConfigError(
				`No ${configFileName} found in ${cwd} or its parents, up to the project root. Run \`linguify init\` to create one, or point at it with --cwd or --config`,
				{ code: errorCodes.configNotFound, details: { cwd } }
			)
		}
		if (result.isEmpty) {
			throw new ConfigError(`${result.filepath} is empty; it needs at least \`{}\``, {
				code: errorCodes.configInvalid,
				details: { file: result.filepath }
			})
		}
		return { file: result.filepath, content: result.config }
	} catch (error) {
		if (error instanceof ConfigError) throw error
		const code = (error as NodeJS.ErrnoException).code
		if (
			config !== undefined &&
			(code === fileErrorCodes.notFound ||
				code === fileErrorCodes.notADirectory ||
				code === fileErrorCodes.isADirectory)
		) {
			const reason = code === fileErrorCodes.isADirectory ? 'is a folder, not a config file' : 'does not exist'
			throw new ConfigError(`Config file ${reason}: ${resolve(cwd, config)}`, {
				code: errorCodes.configNotFound,
				details: { file: resolve(cwd, config) },
				cause: error
			})
		}
		if (config !== undefined && (code === fileErrorCodes.accessDenied || code === fileErrorCodes.notPermitted))
			throw cannotRead(resolve(cwd, config), error)
		if (error instanceof SyntaxError) {
			throw new ConfigError(error.message, { code: errorCodes.configInvalid, cause: error })
		}
		throw error
	}
}

/**
 * runs the resolution, adding a pointer to the upgrade guide when a rejected config is a 1.x one
 *
 * @param run - the resolution to run
 * @param content - the project config as read
 *
 * @returns what `run` returns
 */
const withLegacyHint = <T>(run: () => T, content: unknown): T => {
	try {
		return run()
	} catch (error) {
		const legacy = isPlainObject(content) ? legacyConfigKeys.filter(key => Object.hasOwn(content, key)) : []
		if (!(error instanceof ConfigError) || legacy.length === 0) throw error
		throw new ConfigError(
			`${error.message}\nThis looks like a linguify 1.x config (${legacy.join(', ')}). See "Upgrading from v1" in the README`,
			{ code: error.code, details: { ...error.details, legacyKeys: legacy }, cause: error }
		)
	}
}

/**
 * parses a JSON config, dropping a leading byte-order mark first
 *
 * @note cosmiconfig's own JSON loader passes the mark to `JSON.parse`, which then reports an
 * invisible character as the error
 *
 * @param filepath - the file being loaded, for the error message
 * @param content - its text
 *
 * @returns the parsed JSON
 */
const loadJson: Loader = (filepath, content) => {
	try {
		return JSON.parse(stripByteOrderMark(content))
	} catch (error) {
		if (error instanceof SyntaxError) error.message = `JSON Error in ${filepath}:\n${error.message}`
		throw error
	}
}

/**
 * looks for a config file the search passed over because it could not be read
 *
 * @note cosmiconfig skips a file it may not read as if it did not exist; without this check the user
 * would be told to run `linguify init` while their config sits right there. Only existence is checked,
 * over the same folders the search covers
 *
 * @param cwd - absolute folder the search started from
 *
 * @returns the unreadable file's path, or `undefined` when there is none
 */
const findUnreadableConfig = async (cwd: string): Promise<string | undefined> => {
	for (let folder = cwd; ; folder = dirname(folder)) {
		const candidate = join(folder, configFileName)
		if (await exists(candidate)) return candidate
		const atProjectRoot = await Promise.all(projectRootMarkers.map(marker => exists(join(folder, marker))))
		if (atProjectRoot.includes(true) || dirname(folder) === folder) return undefined
	}
}

/**
 * @param path - file to check
 *
 * @returns whether anything exists at the path, readable or not
 */
const exists = (path: string): Promise<boolean> =>
	access(path).then(
		() => true,
		() => false
	)

/**
 * @param file - the config file that could not be read
 * @param cause - the underlying error, when there is one
 *
 * @returns the error explaining that the file exists but cannot be read
 */
const cannotRead = (file: string, cause?: unknown): ConfigError =>
	new ConfigError(`${file} exists but cannot be read — check its permissions`, {
		code: errorCodes.configInvalid,
		details: { file },
		...(cause === undefined ? {} : { cause })
	})
