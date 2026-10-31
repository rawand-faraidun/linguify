import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { errorCodes, ioColumns } from '@linguify/constants'
import {
	exportCatalogue,
	importCatalogue,
	readCatalogue,
	readTable,
	resolveIoTarget,
	staleTable,
	ValidationError,
	writeFile
} from '@linguify/core'
import type { IoFormat, LoadedConfig } from '@linguify/types'
import { exportInput, importInput, mutationOptions } from '../contracts'
import { run } from '../run'
import { projectProcedure } from '../trpc'

/**
 * `export` — every key as a table, written to a file; it changes no translation, so it takes `dryRun`
 * but no `expectedRevision`. It replaces only an earlier export: never the project's own files, a
 * folder, or a file that is not a linguify table — `-p package.json` must not replace `package.json`
 *
 * @returns the format, the file's absolute path, how many rows, whether it replaces an earlier export, and
 * whether it was written
 */
export const exportProcedure = projectProcedure
	.input(exportInput.extend({ dryRun: mutationOptions.shape.dryRun }).optional())
	.mutation(async ({ ctx, input: { dryRun = false, ...input } = {} }) => {
		const file = await exportCatalogue(ctx.operation, (await readCatalogue(ctx.loaded)).catalogue, input)
		const path = resolve(ctx.cwd, file.path)
		await requireOutsideProject(ctx.loaded, path, file.path)
		const replaces = await requireReplaceable(path, file.format, file.path)
		if (!dryRun) await writeFile(path, file.content)
		return { format: file.format, path, rows: file.rows, replaces, written: !dryRun }
	})

/**
 * `import` — updates and adds keys from a table; never removes one
 *
 * @note returns the table's revision beside the translations'; given back as `expectedTable`, a run is
 * refused when the table changed since its dry run, so it imports what the dry run showed
 */
export const importProcedure = projectProcedure
	.input(importInput.extend(mutationOptions.shape).optional())
	.mutation(async ({ ctx, input: { dryRun, expectedRevision, expectedTable, ...input } = {} }) => {
		const target = resolveIoTarget(ctx.loaded.config, input)
		const table = await readTable(resolve(ctx.cwd, target.path), target.format, target.path)
		if (expectedTable !== undefined && expectedTable !== table.revision)
			throw staleTable(target.path, expectedTable, table.revision)
		const result = await run(ctx, importCatalogue, { table, file: target.path }, { dryRun, expectedRevision })
		return { ...result, table: table.revision }
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
 * @param shownAs - the path as the person gave it, for the message
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for the locales folder, a path inside it, or the config file
 */
const requireOutsideProject = async (loaded: LoadedConfig, path: string, shownAs: string): Promise<void> => {
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
		`Refusing to export to ${shownAs}: it is ${inLocales ? 'inside the locales folder' : 'the config file'}. Choose a path outside the project's own files`,
		{ code: errorCodes.invalidInput, details: { path } }
	)
}

/**
 * makes sure an export replaces nothing but an earlier export
 *
 * @param path - the export's absolute path
 * @param format - the export's format
 * @param shownAs - the path as the person gave it, for messages
 *
 * @returns whether there is an earlier export to replace
 *
 * @throws {@link ValidationError} `INVALID_INPUT` for a folder, or for a file that is not a linguify table —
 * one that does not read as a table in the format, or has no `key` column
 */
const requireReplaceable = async (path: string, format: IoFormat, shownAs: string): Promise<boolean> => {
	const found = await stat(path).catch(() => undefined)
	if (found === undefined) return false
	if (found.isDirectory()) {
		throw new ValidationError(`${shownAs} is a folder. Name a file to export to`, {
			code: errorCodes.invalidInput,
			details: { path }
		})
	}
	const header = await readTable(path, format, shownAs).then(
		table => table.header,
		(): string[] => []
	)
	if (header.includes(ioColumns.key)) return true
	throw new ValidationError(
		`${shownAs} already exists and is not a linguify export, so the export will not replace it. Name another file, or move it away first`,
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
