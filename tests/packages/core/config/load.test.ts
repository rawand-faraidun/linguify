import { chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { type ConfigError, loadConfig } from '@linguify/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { writeFiles } from '../../../setup/files'
import { makeFolder } from '../../../setup/folders'

let base = ''

/**
 * @returns the file found and its locales, or the error's code and first line — paths from the test's folder
 */
const outcome = async (options: Parameters<typeof loadConfig>[0]) => {
	try {
		const loaded = await loadConfig(options)
		return { file: loaded.file.replace(base, '…'), locales: loaded.config.locales }
	} catch (error) {
		return { code: (error as ConfigError).code, message: (error as Error).message.replaceAll(base, '…').split('\n')[0] }
	}
}

beforeEach(async () => {
	base = await makeFolder()
	// a monorepo with a web app holding its own config
	await writeFiles(base, {
		'mono/package.json': { name: 'mono' },
		'mono/apps/web/package.json': { name: 'web' },
		'mono/apps/web/linguify.config.json': { locales: ['en', 'ckb'], path: './public/locales' },
		'mono/apps/web/src/components/': null,
		'mono/configs/staging.json': { locales: ['en'] }
	})
})

describe('loadConfig finding the config', () => {
	it('finds it from a folder deep inside the project, and from the project itself', async () => {
		const found = { file: '…/mono/apps/web/linguify.config.json', locales: ['en', 'ckb'] }
		expect(await outcome({ cwd: join(base, 'mono/apps/web/src/components') })).toEqual(found)
		expect(await outcome({ cwd: join(base, 'mono/apps/web') })).toEqual(found)
	})

	it('stops at the nearest package.json, and says what to do', async () => {
		expect(await outcome({ cwd: join(base, 'mono') })).toEqual({
			code: 'CONFIG_NOT_FOUND',
			message:
				'No linguify.config.json found in …/mono or its parents, up to the project root. Run `linguify init` to create one, or point at it with --cwd or --config'
		})
	})

	it('stops at a package.yaml too', async () => {
		await writeFiles(base, {
			'yaml/linguify.config.json': { locales: ['en'] },
			'yaml/app/package.yaml': 'name: app',
			'yaml/app/src/': null
		})
		expect((await outcome({ cwd: join(base, 'yaml/app/src') })).code).toBe('CONFIG_NOT_FOUND')
	})

	it('searches to the root of the disk when no package file is above', async () => {
		await writeFiles(base, { 'go/linguify.config.json': { locales: ['en'] }, 'go/web/locales/': null })
		expect((await outcome({ cwd: join(base, 'go/web/locales') })).file).toBe('…/go/linguify.config.json')
	})

	it('resolves a relative cwd against the process', async () => {
		const before = process.cwd()
		process.chdir(join(base, 'mono/apps'))
		try {
			expect((await outcome({ cwd: 'web/src' })).file).toBe('…/mono/apps/web/linguify.config.json')
		} finally {
			process.chdir(before)
		}
	})
})

describe('loadConfig with --config', () => {
	it('skips the search, relative to cwd or absolute, even where a search would find another', async () => {
		const staging = { file: '…/mono/configs/staging.json', locales: ['en'] }
		expect(await outcome({ cwd: join(base, 'mono'), config: 'configs/staging.json' })).toEqual(staging)
		expect(await outcome({ cwd: '/', config: join(base, 'mono/configs/staging.json') })).toEqual(staging)
		expect((await outcome({ cwd: join(base, 'mono/apps/web'), config: '../../configs/staging.json' })).file).toBe(
			staging.file
		)
	})

	it('refuses a file not there, a folder, and a file that is not JSON', async () => {
		await writeFiles(base, { 'mono/folder.json/': null })
		expect(await outcome({ cwd: join(base, 'mono'), config: 'nope.json' })).toEqual({
			code: 'CONFIG_NOT_FOUND',
			message: 'Config file does not exist: …/mono/nope.json'
		})
		expect(await outcome({ cwd: join(base, 'mono'), config: 'folder.json' })).toEqual({
			code: 'CONFIG_NOT_FOUND',
			message: 'Config file is a folder, not a config file: …/mono/folder.json'
		})
		expect((await outcome({ cwd: join(base, 'mono'), config: 'linguify.config.js' })).code).toBe('CONFIG_INVALID')
	})
})

describe('loadConfig reading a broken config', () => {
	it('says where JSON broke, and that an empty file needs {}', async () => {
		await writeFiles(base, {
			'broken/package.json': {},
			'broken/linguify.config.json': '{\n  "locales": ["en",\n  "default": "en"\n}\n',
			'empty/package.json': {},
			'empty/linguify.config.json': ''
		})
		expect(await outcome({ cwd: join(base, 'broken') })).toEqual({
			code: 'CONFIG_INVALID',
			message: 'JSON Error in …/broken/linguify.config.json:'
		})
		expect(await outcome({ cwd: join(base, 'empty') })).toEqual({
			code: 'CONFIG_INVALID',
			message: '…/empty/linguify.config.json is empty; it needs at least `{}`'
		})
	})

	it('points a v1 config to the upgrade guide, listing its old keys', async () => {
		await writeFiles(base, {
			'legacy/package.json': {},
			'legacy/linguify.config.json': { localesPath: './public/locales', defaultLocale: 'en', locales: ['en'] }
		})
		const error = await loadConfig({ cwd: join(base, 'legacy') }).catch((thrown: ConfigError) => thrown)
		expect((error as Error).message.split('\n').at(-1)).toBe(
			'This looks like a linguify 1.x config (localesPath, defaultLocale). See "Upgrading from v1" in the README'
		)
		expect((error as ConfigError).details?.legacyKeys).toEqual(['localesPath', 'defaultLocale'])
	})

	it('reads a config Notepad saved with a byte order mark', async () => {
		await writeFiles(base, { 'bom/package.json': {}, 'bom/linguify.config.json': '﻿{"locales":["en","ckb"]}' })
		expect((await outcome({ cwd: join(base, 'bom') })).locales).toEqual(['en', 'ckb'])
	})

	it.skipIf(process.getuid?.() === 0)('says an unreadable config cannot be read, rather than not found', async () => {
		await writeFiles(base, { 'locked/package.json': {}, 'locked/linguify.config.json': { locales: ['en'] } })
		await chmod(join(base, 'locked/linguify.config.json'), 0o000)
		const unreadable = {
			code: 'CONFIG_INVALID',
			message: '…/locked/linguify.config.json exists but cannot be read — check its permissions'
		}
		try {
			expect(await outcome({ cwd: join(base, 'locked') })).toEqual(unreadable)
			expect(await outcome({ cwd: join(base, 'locked'), config: 'linguify.config.json' })).toEqual(unreadable)
		} finally {
			await chmod(join(base, 'locked/linguify.config.json'), 0o644)
		}
	})
})

describe('loadConfig layering and paths', () => {
	it('lays the editor and flag layers over the file, the root its folder, the locales from it', async () => {
		const loaded = await loadConfig({
			cwd: join(base, 'mono/apps/web/src'),
			editor: { studio: { port: 6000 } },
			flag: { studio: { open: false } }
		})
		expect([
			loaded.config.studio.port,
			loaded.sources['studio.port'],
			loaded.config.studio.open,
			loaded.sources['studio.open'],
			loaded.sources.locales
		]).toEqual([6000, 'editor', false, 'flag', 'project'])
		expect(loaded.root).toBe(join(base, 'mono/apps/web'))
		expect(loaded.localesDirectory).toBe(join(base, 'mono/apps/web/public/locales'))
	})
})
