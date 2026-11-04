import { join } from 'node:path'
import type { MutationResult } from '@linguify/api'
import type { ConfigSources, LoadedConfig } from '@linguify/types'
import { describe, expect, it } from 'vitest'
import { freePort, runCli, runCliJson, startCliStudio } from '../../setup/cli'
import { makeProject } from '../../setup/project'

const project = (config: Record<string, unknown> = {}) =>
	makeProject({
		'linguify.config.json': { locales: ['en', 'ckb'], ...config },
		'locales/en.json': { common: { save: 'Save' } },
		'locales/ckb.json': { common: { save: 'پاشەکەوتکردن', old: 'کۆن' } },
		'deep/folder/': null
	})

describe('global flags', () => {
	it('are read before the command or after it', async () => {
		const { cwd } = await project()
		const before = await runCli(['--json', 'list', 'locales'], cwd)
		const after = await runCli(['list', 'locales', '--json'], cwd)
		expect(JSON.parse(before.stdout)).toEqual({ ok: true, data: { default: 'en', locales: ['en', 'ckb'] } })
		expect(after.stdout).toBe(before.stdout)
	})

	it('--cwd finds the config from another folder, before or after the command', async () => {
		const { cwd } = await project()
		const elsewhere = await makeProject({})
		expect((await runCli(['--cwd', join(cwd, 'deep/folder'), 'list', 'locales'], elsewhere.cwd)).stdout).toBe(
			'en\nckb\n'
		)
		expect((await runCli(['list', 'locales', '--cwd', join(cwd, 'deep/folder')], elsewhere.cwd)).stdout).toBe(
			'en\nckb\n'
		)
	})

	it('-c reads a config by name, refusing one not there', async () => {
		const { cwd } = await project()
		const { answer, code } = await runCliJson(['-c', 'nope.json', 'list', 'locales'], cwd)
		expect([answer.ok, answer.error?.code, answer.error?.message, code]).toEqual([
			false,
			'CONFIG_NOT_FOUND',
			`Config file does not exist: ${join(cwd, 'nope.json')}`,
			1
		])
	})

	it('--json prints one object on stdout, errors included, and nothing on stderr', async () => {
		const { cwd } = await project()
		const { answer, stderr, code } = await runCliJson(['key', 'remove', 'common.save'], cwd)
		expect([answer, stderr, code]).toEqual([
			{
				ok: false,
				error: {
					code: 'CONFIRMATION_REQUIRED',
					message:
						'key remove deletes keys from every locale, and there is no one here to confirm it. Pass --yes to go ahead'
				}
			},
			'',
			1
		])
	})

	it('--help and --version exit 0', async () => {
		const { cwd } = await project()
		const help = await runCli(['--help'], cwd)
		expect([help.code, help.stdout.startsWith('Usage: linguify')]).toEqual([0, true])
		const version = await runCli(['--version'], cwd)
		expect([version.code, version.stdout]).toMatchObject([0, expect.stringMatching(/^\d+\.\d+\.\d+\n$/)])
	})
})

describe("the command line's own mistakes", () => {
	it.each([
		[['bogus'], "unknown command 'bogus'", 'commander.unknownCommand'],
		[['sync', '--nope'], "unknown option '--nope'", 'commander.unknownOption'],
		[
			['studio', '--port', 'abc'],
			"option '-p, --port <number>' argument 'abc' is invalid. Give the port as a number — 5678",
			'commander.invalidArgument'
		]
	])('%j is INVALID_INPUT, exit 1', async (args, message, reason) => {
		const { cwd } = await project()
		const { answer, code } = await runCliJson(args, cwd)
		expect([answer, code]).toEqual([{ ok: false, error: { code: 'INVALID_INPUT', message, details: { reason } } }, 1])
	})

	it('says so on stderr for a person, with a hint at --help, exit 1', async () => {
		const { cwd } = await project()
		const { stdout, stderr, code } = await runCli(['sync', '--nope'], cwd)
		expect([stdout, stderr, code]).toEqual([
			'',
			"error unknown option '--nope'\nINVALID_INPUT\nRun with --help to see what this command accepts\n",
			1
		])
	})

	it('a group command alone prints its help and exits 1', async () => {
		const { cwd } = await project()
		const { stderr, code } = await runCli(['list'], cwd)
		expect([stderr.startsWith('Usage: linguify list'), code]).toEqual([true, 1])
	})
})

describe('a flag never overrides the config unless typed', () => {
	it('sync takes sync.removeUnused from the config, --no-remove-unused turning it off', async () => {
		const { cwd } = await project({ sync: { removeUnused: true } })
		const configured = await runCliJson<MutationResult>(['sync', '--dry-run'], cwd)
		expect(configured.answer.data?.report.changes).toEqual([{ kind: 'removed', path: 'common.old', locales: ['ckb'] }])
		const off = await runCliJson<MutationResult>(['sync', '--no-remove-unused', '--dry-run'], cwd)
		expect(off.answer.data?.report.changes).toEqual([])
	})

	it('sync --remove-unused turns it on over a config without it', async () => {
		const { cwd } = await project()
		expect((await runCliJson<MutationResult>(['sync', '--dry-run'], cwd)).answer.data?.report.changes).toEqual([])
		expect(
			(await runCliJson<MutationResult>(['sync', '--remove-unused', '--dry-run'], cwd)).answer.data?.report.changes
		).toEqual([{ kind: 'removed', path: 'common.old', locales: ['ckb'] }])
	})

	it('config reports each value from the config file, not from a flag left out', async () => {
		const { cwd } = await project({ studio: { port: 6000, open: false } })
		const { answer } = await runCliJson<{ config: LoadedConfig['config']; sources: ConfigSources }>(['config'], cwd)
		expect([
			answer.data?.config.studio,
			answer.data?.sources['studio.port'],
			answer.data?.sources['studio.open']
		]).toEqual([{ port: 6000, open: false, defaultView: 'flat' }, 'project', 'project'])
	})

	it('studio binds the configured port, and --port over it', async () => {
		const [configured, typed] = [await freePort(), await freePort()]
		const { cwd } = await project({ studio: { port: configured } })
		expect((await startCliStudio([], cwd)).data?.url).toBe(`http://127.0.0.1:${configured}`)
		expect((await startCliStudio(['--port', String(typed)], cwd)).data?.url).toBe(`http://127.0.0.1:${typed}`)
	})
})

describe('input flags', () => {
	it('-t is repeatable, split at its first =, a locale given twice refused', async () => {
		const files = await project({ locales: ['en', 'ckb', 'de'] })
		await runCliJson(['key', 'add', 'common.equation', '--value', 'a=b', '-t', 'ckb=x=y', '-t', 'de=z'], files.cwd)
		expect(await files.json('locales/ckb.json')).toMatchObject({ common: { equation: 'x=y' } })
		expect(await files.json('locales/de.json')).toEqual({ common: { equation: 'z' } })
		const twice = await runCliJson(['key', 'add', 'common.x', '-t', 'ckb=یەک', '-t', 'ckb=دوو'], files.cwd)
		expect(twice.answer.error).toEqual({
			code: 'INVALID_INPUT',
			message: '`ckb` is given twice with --translation',
			details: { locale: 'ckb' }
		})
	})

	it('key add --yes creates a missing namespace; without it the CLI says to pass it', async () => {
		const { cwd } = await project()
		const refused = await runCliJson(['key', 'add', 'other.x'], cwd)
		expect(refused.answer.error?.message).toBe(
			'The namespace `other` does not exist. Pass --yes to create it, or set `keys.createNamespace`'
		)
		const created = await runCliJson<MutationResult>(['key', 'add', 'other.x', '--value', 'X', '--yes'], cwd)
		expect(created.answer.data?.report.changes).toEqual([{ kind: 'added', path: 'other.x', locales: ['en', 'ckb'] }])
	})

	it('--dry-run writes nothing', async () => {
		const files = await project()
		const before = await files.text('locales/en.json')
		await runCliJson(['key', 'add', 'common.delete', '--value', 'Delete', '--dry-run'], files.cwd)
		expect(await files.text('locales/en.json')).toBe(before)
	})

	it('key remove --yes removes without asking', async () => {
		const files = await project()
		const { code } = await runCliJson(['key', 'remove', 'common.save', '--yes'], files.cwd)
		expect([code, await files.json('locales/en.json')]).toEqual([0, { common: {} }])
	})
})

describe('exit codes', () => {
	it('format --check exits 1 while a file needs formatting, then 0', async () => {
		const { cwd } = await project()
		const check = await runCli(['format', '--check'], cwd)
		expect([check.code, check.stdout]).toEqual([
			1,
			'needs formatting  locales/ckb.json\n\nRun `linguify format` to format it\n'
		])
		expect((await runCli(['format'], cwd)).code).toBe(0)
		expect((await runCli(['format', '--check'], cwd)).code).toBe(0)
	})

	it('diff exits 0 even when locales differ — it reports, format --check gates', async () => {
		const { cwd } = await project()
		expect(await runCli(['diff'], cwd)).toEqual({ stdout: 'ckb\textra\tcommon.old\n', stderr: '', code: 0 })
	})
})

describe('piped output', () => {
	it('is one item per line, the text after a tab with -l', async () => {
		const { cwd } = await project()
		expect((await runCli(['list', 'keys'], cwd)).stdout).toBe('common.save\ncommon.old\n')
		expect((await runCli(['list', 'keys', '-l', 'ckb'], cwd)).stdout).toBe(
			'common.save\tپاشەکەوتکردن\ncommon.old\tکۆن\n'
		)
	})

	it('writes a control character in a text out, so a translation cannot drive the terminal', async () => {
		const files = await makeProject({
			'linguify.config.json': {},
			'locales/en.json': { common: { bell: 'ring\u0007\u001b[31mred' } }
		})
		expect((await runCli(['list', 'keys', '-l', 'en'], files.cwd)).stdout).toBe(
			'common.bell\tring\\u0007\\u001b[31mred\n'
		)
	})
})

describe('init', () => {
	it('--yes writes a config with only $schema, and the default locale file', async () => {
		const files = await makeProject({})
		const { code } = await runCli(['init', '--yes'], files.cwd)
		expect(code).toBe(0)
		expect(Object.keys((await files.json('linguify.config.json')) as object)).toEqual(['$schema'])
		expect(await files.list('locales')).toEqual(['en.json'])
	})

	it('without --yes and no terminal, asks no one and writes nothing', async () => {
		const files = await makeProject({})
		const { answer, code } = await runCliJson(['init'], files.cwd)
		expect([answer.error?.code, code, await files.list('.')]).toEqual(['CONFIRMATION_REQUIRED', 1, []])
	})
})
