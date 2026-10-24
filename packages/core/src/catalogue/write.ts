import { isAbsolute, relative, sep } from 'node:path'
import { errorCodes, lineEnding, windowsLineEnding } from '@linguify/constants'
import type { LoadedConfig, Revision } from '@linguify/types'
import type { FileContent, FileSnapshot } from '../engine'
import { ConflictError, UnexpectedError } from '../errors'
import { removeFile, writeFile } from '../utils'
import { readCatalogue } from './read'

/**
 * one file a write plan creates or replaces
 */
export type PlannedWrite = {
	file: string
	content: string
}

/**
 * every file a change needs written or deleted; `--dry-run` prints it instead of applying it
 */
export type WritePlan = {
	write: PlannedWrite[]
	delete: string[]
}

/**
 * {@link planWrite} options
 */
export type PlanOptions = {
	/**
	 * write files that do not exist yet; `format` turns this off, since creating a missing locale's
	 * file is `sync`'s job, not formatting
	 */
	create?: boolean

	/**
	 * treat a file that differs only in its line endings as unchanged; `format` turns this on, since Git
	 * on Windows checks files out with `\r\n`, and `format --check` must not fail every file there
	 */
	anyLineEnding?: boolean

	/**
	 * the files the catalogue serialised to before the change; a file that serialises the same way after
	 * it is not written, whatever it looks like on disk — a change rewrites only the files it changed,
	 * and leaves reformatting the rest to `format`
	 */
	previous?: readonly FileContent[]
}

/**
 * works out which files a change needs written or deleted
 *
 * @note pure: `--dry-run` is this plan, printed and not applied
 *
 * @param read - the files as they were read
 * @param next - every file the changed translations occupy, as `serialize` gives them
 * @param options - whether files that do not exist yet are written, and whether line endings count
 *
 * @returns the files whose content changes or that do not exist yet, and the files no longer needed
 */
export const planWrite = (
	read: readonly FileSnapshot[],
	next: readonly FileContent[],
	{ create = true, anyLineEnding = false, previous }: PlanOptions = {}
): WritePlan => {
	const serialisedBefore = new Map(previous?.map(file => [file.path, file.content]))
	const before = new Map(
		read.map(({ path, content }) => [
			path,
			anyLineEnding ? (content?.replaceAll(windowsLineEnding, lineEnding) ?? null) : content
		])
	)
	const kept = new Set(next.map(file => file.path))
	return {
		write: next
			.filter(file => before.get(file.path) !== file.content)
			.filter(file => create || typeof before.get(file.path) === 'string')
			.filter(file => serialisedBefore.get(file.path) !== file.content)
			.map(file => ({ file: file.path, content: file.content })),
		delete: read.filter(file => file.content !== null && !kept.has(file.path)).map(file => file.path)
	}
}

/**
 * the write each locales folder is busy with, so the next one waits for it
 */
const writes = new Map<string, Promise<void>>()

/**
 * carries out a write plan, unless the files changed on disk since they were read
 *
 * @note the files are read again first and compared by revision, so an edit made by hand — or by a
 * second linguify — is refused instead of overwritten. Writes to one locales folder take turns within a
 * process, so two saves made from the same revision — two quick studio requests — cannot both pass the
 * check; across processes nothing locks, and only the moment of writing itself is left open. Files are
 * written before any is deleted, so a failure midway leaves a namespace twice rather than nowhere —
 * except a delete that only renames by case (`common.json` → `Common.json`), which goes first: on a
 * case-insensitive disk the two names are one file, and deleting after writing would delete the write.
 * An empty plan touches nothing and returns the caller's revision unchanged: reporting a newer one
 * would let the caller's next write pass this check against files it never saw
 *
 * @param loaded - the loaded config
 * @param plan - what to write and delete
 * @param expectedRevision - the revision the caller read the translations at
 *
 * @returns the revision after the write
 *
 * @throws {@link ConflictError} `STALE_CATALOGUE` when the files moved; nothing is written
 * @throws {@link UnexpectedError} when a path lies outside the locales folder; nothing is written
 */
export const applyWrite = async (
	loaded: LoadedConfig,
	plan: WritePlan,
	expectedRevision: Revision
): Promise<Revision> => {
	if (plan.write.length === 0 && plan.delete.length === 0) return expectedRevision

	for (const file of [...plan.write.map(({ file }) => file), ...plan.delete]) {
		const inside = relative(loaded.localesDirectory, file)
		if (inside === '' || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
			throw new UnexpectedError(`Refusing to write outside the locales folder: ${file}`, {
				code: errorCodes.unexpected,
				details: { file, directory: loaded.localesDirectory }
			})
		}
	}

	return inTurn(loaded.localesDirectory, async () => {
		const current = await readCatalogue(loaded)
		if (current.revision !== expectedRevision) throw staleCatalogue(expectedRevision, current.revision)

		const written = new Set(plan.write.map(({ file }) => file.toLowerCase()))
		const renamed = plan.delete.filter(file => written.has(file.toLowerCase()))
		for (const file of renamed) await removeFile(file)
		for (const { file, content } of plan.write) await writeFile(file, content)
		for (const file of plan.delete) if (!renamed.includes(file)) await removeFile(file)
		return (await readCatalogue(loaded)).revision
	})
}

/**
 * runs a task once the one before it on the same folder has settled
 *
 * @param folder - the locales folder
 * @param task - the write to run
 *
 * @returns what the task returns
 */
const inTurn = async <T>(folder: string, task: () => Promise<T>): Promise<T> => {
	const result = (writes.get(folder) ?? Promise.resolve()).then(task)
	const settled = result.then(
		() => undefined,
		() => undefined
	)
	writes.set(folder, settled)
	try {
		return await result
	} finally {
		if (writes.get(folder) === settled) writes.delete(folder)
	}
}

/**
 * @param expected - the revision the caller read the translations at
 * @param actual - the revision the files are at now
 *
 * @returns the error for a write that would overwrite changes the caller never saw
 */
export const staleCatalogue = (expected: Revision, actual: Revision): ConflictError =>
	new ConflictError('The translation files changed on disk after they were read. Read them again, then save', {
		code: errorCodes.staleCatalogue,
		details: { expected, actual }
	})
