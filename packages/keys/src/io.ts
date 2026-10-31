import { ioFormats, pathSeparator, shownSeparators } from '@linguify/constants'
import type { IoFormat } from '@linguify/types'

/**
 * @param value - a format's name, as a control reports it or a file's extension gives it
 *
 * @returns whether it is a table format
 */
export const isIoFormat = (value: string | undefined): value is IoFormat =>
	Object.values(ioFormats).some(format => format === value)

/**
 * the table format a file's extension names, in any case — `words.XLSX` is an xlsx file
 *
 * @note read as Node's `extname` reads it: from the last dot of the file's own name, and a name that only
 * starts with a dot, `.csv`, has no extension
 *
 * @param path - a file path, with either separator
 *
 * @returns the format, or `undefined` for any other extension or none
 */
export const formatOfFile = (path: string): IoFormat | undefined => {
	const name = path.split(pathSeparator).pop() ?? ''
	const dot = name.lastIndexOf('.')
	const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : undefined
	return isIoFormat(extension) ? extension : undefined
}

/**
 * a file's path as every surface shows it: from the folder the person works in — as Node's `relative`
 * gives it, `../other/words.csv` for a file beside it — or whole on another drive
 *
 * @param from - the folder, absolute
 * @param file - the file, absolute
 *
 * @returns the path from the folder, with the folder's own separator; the file's own path when it is the
 * folder itself or on another drive
 */
export const relativePath = (from: string, file: string): string => {
	const windows = from.includes(shownSeparators.windows) && !from.includes(shownSeparators.other)
	const separator = windows ? shownSeparators.windows : shownSeparators.other
	const split = (path: string) => path.split(pathSeparator).filter(segment => segment !== '')
	const [folder, target] = [split(from), split(file)]
	// a Windows drive is a root of its own: no path leads from one to another
	if (folder[0]?.endsWith(':') && folder[0].toLowerCase() !== target[0]?.toLowerCase()) return file
	let shared = 0
	while (shared < folder.length && shared < target.length && folder[shared] === target[shared]) shared++
	const up = folder.slice(shared).map(() => '..')
	return [...up, ...target.slice(shared)].join(separator) || file
}
