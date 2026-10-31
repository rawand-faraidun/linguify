import { errorCodes, ioDefaultPaths, ioFormats } from '@linguify/constants'
import { formatOfFile } from '@linguify/keys'
import type { Config, IoFormat } from '@linguify/types'
import { ValidationError } from '../errors'

/**
 * where an export goes or an import comes from, and in which format
 */
export type IoTarget = {
	format: IoFormat

	/**
	 * as given, or the default `translations.<format>` — relative to the working directory
	 */
	path: string
}

/**
 * works out an export's or an import's format and file
 *
 * @note the format is the one given, else the one the file's extension names, else `io.format`; so
 * `-p words.xlsx` alone is an xlsx file
 *
 * @param config - the resolved config
 * @param input - the format and path the input gives, either or both
 *
 * @returns the format and the path
 *
 * @throws {@link ValidationError} `INVALID_INPUT` when the given format and the file's extension name
 * two different formats
 */
export const resolveIoTarget = (
	{ io }: Config,
	{ format, path }: { format?: IoFormat | undefined; path?: string | undefined }
): IoTarget => {
	const named = path === undefined ? undefined : formatOfFile(path)
	if (format !== undefined && named !== undefined && format !== named) {
		throw new ValidationError(
			`\`${path}\` is ${named === ioFormats.xlsx ? 'an' : 'a'} ${named} file, but the format asked for is ${format}`,
			{
				code: errorCodes.invalidInput,
				details: { path, format }
			}
		)
	}
	const resolved = format ?? named ?? io.format
	return { format: resolved, path: path ?? ioDefaultPaths[resolved] }
}
