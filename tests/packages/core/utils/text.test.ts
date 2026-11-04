import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readTextFile, stripByteOrderMark, writeFile } from '@linguify/core'
import { describe, expect, it } from 'vitest'
import { makeFolder } from '../../../setup/folders'

describe('stripByteOrderMark', () => {
	it('drops a leading byte order mark, only there', () => {
		expect(stripByteOrderMark('﻿{"a":"b"}')).toBe('{"a":"b"}')
		expect(stripByteOrderMark('{"a":"﻿"}')).toBe('{"a":"﻿"}')
	})
})

describe('readTextFile', () => {
	it('reads UTF-8 text, and gives null for a file not there', async () => {
		const folder = await makeFolder()
		await writeFile(join(folder, 'ckb.json'), '{"save":"پاشەکەوتکردن"}')
		expect(await readTextFile(join(folder, 'ckb.json'))).toBe('{"save":"پاشەکەوتکردن"}')
		expect(await readTextFile(join(folder, 'missing.json'))).toBeNull()
	})

	it('throws any other failure, such as a folder in its place', async () => {
		const folder = await makeFolder()
		await mkdir(join(folder, 'en.json'))
		await expect(readTextFile(join(folder, 'en.json'))).rejects.toMatchObject({ code: 'EISDIR' })
	})
})
