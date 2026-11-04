import { formatOfFile, isIoFormat, relativePath } from '@linguify/keys'
import { describe, expect, it } from 'vitest'

describe('isIoFormat', () => {
	it('knows the four table formats and nothing else', () => {
		expect(['csv', 'tsv', 'json', 'xlsx', 'xls', '', undefined].map(isIoFormat)).toEqual([
			true,
			true,
			true,
			true,
			false,
			false,
			false
		])
	})
})

describe('formatOfFile', () => {
	it.each([
		['translations.csv', 'csv'],
		['words.XLSX', 'xlsx'],
		['out/table.tsv', 'tsv'],
		['C:\\exports\\table.json', 'json'],
		['archive.tar.csv', 'csv'],
		['.csv', undefined],
		['notes.txt', undefined],
		['no-extension', undefined],
		['folder.csv/file', undefined]
	])('%s → %s', (path, format) => {
		expect(formatOfFile(path)).toBe(format)
	})
})

describe('relativePath', () => {
	it('gives a path from the folder, with its own separator', () => {
		expect(relativePath('/work/app', '/work/app/translations.csv')).toBe('translations.csv')
		expect(relativePath('/work/app', '/work/other/words.csv')).toBe('../other/words.csv')
		expect(relativePath('C:\\work\\app', 'C:\\work\\app\\out\\words.csv')).toBe('out\\words.csv')
	})

	it('gives the whole path for the folder itself or another drive', () => {
		expect(relativePath('/work/app', '/work/app')).toBe('/work/app')
		expect(relativePath('C:\\work', 'D:\\words.csv')).toBe('D:\\words.csv')
	})

	it('matches a Windows path in any case, as Windows does — a POSIX path exactly', () => {
		expect(relativePath('C:\\Work', 'c:\\work\\words.csv')).toBe('words.csv')
		expect(relativePath('/Work', '/work/words.csv')).toBe('../work/words.csv')
	})
})
