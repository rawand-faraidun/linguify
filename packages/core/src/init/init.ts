import { access } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import {
	appName,
	configFileName,
	errorCodes,
	generatedFileFormat,
	installedPackagesFolder,
	remoteSchema,
	schemaFileName
} from '@linguify/constants'
import type { Config, EngineOptions, Locale } from '@linguify/types'
import { scaffoldCatalogue } from '../catalogue'
import { loadConfig, parseConfig } from '../config'
import { readSnapshot } from '../engine'
import { ConfigError } from '../errors'
import { formatJson, removeFile, writeFile } from '../utils'

/**
 * `init`'s input — every field falls back to the config's default
 */
export type InitInput = {
	/**
	 * where the translation files live, relative to the config
	 */
	path?: string | undefined
	locales?: Locale[] | undefined

	/**
	 * the locale every other is compared against — the first of `locales` when left out
	 */
	default?: Locale | undefined

	/**
	 * the engine's options — the JSON engine's `fileStructure` and `namespaces`
	 */
	options?: EngineOptions | undefined
}

/**
 * what `init` did
 */
export type InitResult = {
	/**
	 * the new config file's absolute path
	 */
	file: string
	config: Config

	/**
	 * the locale files created, absolute
	 */
	created: string[]

	/**
	 * the locale files that were already there and were left exactly as they were
	 */
	kept: string[]
}

/**
 * starts a project: writes `linguify.config.json` in a folder, then creates the locale files it needs
 *
 * @note never overwrites: an existing config is an error, and an existing locale file is kept as it
 * is — adopting linguify in a project that already has `en.json` must not empty it. The whole config is
 * validated before anything is written, and when a locale file cannot be created, the config and the
 * files created so far are removed again, so running `init` once more starts clean. `$schema` points at the installed linguify's schema when there
 * is one in the folder or above it, else at the published one
 *
 * @param cwd - the folder to start the project in
 * @param input - the answers; anything left out takes the default
 *
 * @returns the config file, the config, and the locale files created and kept
 *
 * @throws {@link ConfigError} `CONFIG_EXISTS` when the folder has a config already, `CONFIG_INVALID` for
 * answers the config cannot hold
 */
export const initProject = async (
	cwd: string,
	{ path, locales, default: defaultLocale, options }: InitInput
): Promise<InitResult> => {
	const folder = resolve(cwd)
	const file = join(folder, configFileName)
	if ((await readSnapshot(file)).content !== null) {
		throw new ConfigError(
			`${configFileName} already exists in ${folder}; init never overwrites a config. Edit it, or delete it to start over`,
			{
				code: errorCodes.configExists,
				details: { file }
			}
		)
	}

	const chosenDefault = defaultLocale ?? locales?.[0]
	const content = {
		$schema: await schemaFor(folder),
		...(path === undefined ? {} : { path }),
		...(locales === undefined ? {} : { locales }),
		...(chosenDefault === undefined ? {} : { default: chosenDefault }),
		...(options === undefined || Object.keys(options).length === 0 ? {} : { options })
	}
	parseConfig(content)
	await writeFile(file, formatJson(content, generatedFileFormat))

	const created: string[] = []
	const kept: string[] = []
	try {
		const loaded = await loadConfig({ cwd: folder, config: configFileName })
		for (const { path: target, content: scaffold } of scaffoldCatalogue(loaded)) {
			if ((await readSnapshot(target)).content !== null) {
				kept.push(target)
				continue
			}
			await writeFile(target, scaffold)
			created.push(target)
		}
		return { file, config: loaded.config, created, kept }
	} catch (error) {
		for (const path of [...created, file]) await removeFile(path)
		throw error
	}
}

/**
 * @param folder - where the config goes
 *
 * @returns the `$schema` for it: linguify's schema as installed in this folder or one above it, relative
 * to the config; else the published schema
 *
 * @note looked for on disk, not through Node's module resolution: that also consults `NODE_PATH`, which
 * pnpm's launchers set, so `pnpm dlx linguify init` would point the config into pnpm's temporary cache
 */
const schemaFor = async (folder: string): Promise<string> => {
	for (let current = folder; ; current = dirname(current)) {
		const installed = join(current, installedPackagesFolder, appName, schemaFileName)
		if (await exists(installed)) {
			const path = relative(folder, installed).split(sep).join('/')
			return path.startsWith('.') ? path : `./${path}`
		}
		if (dirname(current) === current) return remoteSchema
	}
}

/**
 * @param path - a path
 *
 * @returns whether anything is there
 */
const exists = (path: string): Promise<boolean> =>
	access(path).then(
		() => true,
		() => false
	)
