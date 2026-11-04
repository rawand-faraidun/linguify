import { chmod, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { removeFile, writeFile } from '@linguify/core'
import { describe, expect, it } from 'vitest'
import { makeFolder } from '../../../setup/folders'

describe('writeFile', () => {
	it('makes the folders on the way, then writes and overwrites, leaving no temporary file', async () => {
		const file = join(await makeFolder(), 'locales', 'ckb', 'common.json')
		await writeFile(file, 'first\n')
		expect(await readFile(file, 'utf8')).toBe('first\n')
		await writeFile(file, 'second')
		expect(await readFile(file, 'utf8')).toBe('second')
		expect(await readdir(join(file, '..'))).toEqual(['common.json'])
	})

	it('leaves one whole content after 20 writers at once, never a mix', async () => {
		const file = join(await makeFolder(), 'en.json')
		await Promise.all(Array.from({ length: 20 }, (_, index) => writeFile(file, `writer ${index} `.repeat(500))))
		const written = await readFile(file, 'utf8')
		expect(written).toMatch(/^(writer \d+ )\1{499}$/)
		expect(await readdir(join(file, '..'))).toEqual(['en.json'])
	})

	it.skipIf(process.getuid?.() === 0)('keeps the old file whole when a write fails', async () => {
		const folder = join(await makeFolder(), 'locked')
		const file = join(folder, 'en.json')
		await writeFile(file, '{"kept":"yes"}')
		await chmod(folder, 0o555)
		try {
			await expect(writeFile(file, '{"half":')).rejects.toMatchObject({ code: 'EACCES' })
		} finally {
			await chmod(folder, 0o755)
		}
		expect(await readFile(file, 'utf8')).toBe('{"kept":"yes"}')
		expect(await readdir(folder)).toEqual(['en.json'])
	})
})

describe('removeFile', () => {
	it('removes a file, and is no error once it is gone', async () => {
		const file = join(await makeFolder(), 'en.json')
		await writeFile(file, '{}')
		await removeFile(file)
		expect(await readdir(join(file, '..'))).toEqual([])
		await expect(removeFile(file)).resolves.toBeUndefined()
	})
})
