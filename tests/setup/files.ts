import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * writes files under a folder, making the folders on the way
 *
 * @param folder - the folder, absolute
 * @param files - each file's path inside it and its content — an object is written as JSON, a path ending in
 * `/` is made as an empty folder
 */
export const writeFiles = async (folder: string, files: Readonly<Record<string, unknown>>): Promise<void> => {
	for (const [path, content] of Object.entries(files)) {
		const target = join(folder, path)
		if (path.endsWith('/')) {
			await mkdir(target, { recursive: true })
			continue
		}
		await mkdir(dirname(target), { recursive: true })
		await writeFile(target, typeof content === 'string' ? content : `${JSON.stringify(content, null, '\t')}\n`)
	}
}
