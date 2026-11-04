import { describe, expect, it } from 'vitest'
import { openProject, refusal } from '../../../setup/caller'

describe('init', () => {
	it('writes only what was answered, then each locale file', async () => {
		const project = await openProject({})
		const result = await project.api.init({ locales: ['en', 'ckb'] })
		expect(result.file).toBe(`${project.cwd}/linguify.config.json`)
		expect(result.created.map(file => file.replace(project.cwd, ''))).toEqual(['/locales/en.json', '/locales/ckb.json'])
		const { $schema, ...config } = (await project.json('linguify.config.json')) as Record<string, unknown>
		expect(config).toEqual({ locales: ['en', 'ckb'], default: 'en' })
		expect($schema).toBe('https://unpkg.com/linguify@2/schema.json')
		expect(await project.text('locales/ckb.json')).toBe('{}\n')
	})

	it('keeps a locale file already there', async () => {
		const project = await openProject({ 'locales/en.json': { common: { save: 'Save' } } })
		const result = await project.api.init({ locales: ['en', 'ckb'] })
		expect(result.kept.map(file => file.replace(project.cwd, ''))).toEqual(['/locales/en.json'])
		expect(await project.json('locales/en.json')).toEqual({ common: { save: 'Save' } })
	})

	it('refuses a project with a config already, and a config it would refuse to read', async () => {
		const project = await openProject({ 'linguify.config.json': {} })
		expect((await refusal(project.api.init({}))).code).toBe('CONFIG_EXISTS')
		const fresh = await openProject({})
		expect((await refusal(fresh.api.init({ locales: ['en'], default: 'ckb' }))).code).toBe('CONFIG_INVALID')
		expect(await fresh.list('.')).toEqual([])
	})
})
