import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { errorCodes } from '@linguify/constants'
import {
	exportCatalogue,
	importCatalogue,
	readCatalogue,
	readTable,
	resolveIoTarget,
	ValidationError,
	writeFile
} from '@linguify/core'
import type { LoadedConfig } from '@linguify/types'
import { exportInput, importInput, mutationOptions } from '../contracts'
import { run } from '../run'
import { projectProcedure } from '../trpc'

/**
 * `export` — every key as a table, written to a file; it changes no translation, so it takes `dryRun`
 * but no `expectedRevision`
 *
 * @returns the format, the file's absolute path, how many rows, and whether it was written
 */
export const exportProcedure = projectProcedure
	.input(exportInput.extend({ dryRun: mutationOptions.shape.dryRun }).optional())
	.mutation(async ({ ctx, input: { dryRun = false, ...input } = {} }) => {
		const file = await exportCatalogue(ctx.operation, (await readCatalogue(ctx.loaded)).catalogue, input)
		const path = resolve(ctx.cwd, file.path)
		await requireOutsideProject(ctx.loaded, path)
		if (!dryRun) await writeFile(path, file.content)
		return { format: file.format, path, rows: file.rows, written: !dryRun }
	})

/**
 * `import` — updates and adds keys from a table; never removes one
 */
export const importProcedure = projectProcedure
	.input(importInput.extend(mutationOptions.shape).optional())
	.mutation(async ({ ctx, input: { dryRun, expectedRevision, ...input } = {} }) => {
		const target = resolveIoTarget(ctx.loaded.config, input)
		const table = await readTable(resolve(ctx.cwd, target.path), target.format)
		return run(ctx, importCatalogue, { table, file: target.path }, { dryRun, expectedRevision })
	})

/**
 * makes sure an export does not land on the project's own files
 *
 * @note compared by identity on disk — device and inode — never by path text: on a case-insensitive disk
 * `LOCALES/en.json` is `locales/en.json`, and a symlink to the locales folder is the locales folder; a
 * text comparison let both through and replaced a translation file with a table
 *
 * @param loaded - the loaded config
 * @param path - the export's absolute path
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for the locales folder, a path inside it, or the config file
 */
const requireOutsideProject = async (loaded: LoadedConfig, path: string): Promise<void> => {
	const [locales, config, target] = await Promise.all([
		identify(loaded.localesDirectory),
		identify(loaded.file),
		identify(path)
	])
	let inLocales = false
	for (let folder = path; !inLocales; folder = dirname(folder)) {
		const id = await identify(folder)
		inLocales = id !== undefined && id === locales
		if (dirname(folder) === folder) break
	}
	if (!inLocales && (target === undefined || target !== config)) return
	throw new ValidationError(
		`Refusing to export to ${path}: it is ${inLocales ? 'inside the locales folder' : 'the config file'}, and the export would replace it`,
		{ code: errorCodes.invalidInput, details: { path } }
	)
}

/**
 * @param path - a path that may or may not exist
 *
 * @returns what it is on disk — device and inode, following symlinks — or `undefined` when nothing is there
 */
const identify = (path: string): Promise<string | undefined> =>
	stat(path).then(
		({ dev, ino }) => `${dev}:${ino}`,
		() => undefined
	)
