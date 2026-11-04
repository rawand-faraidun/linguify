// what the studio and the panel say before sending a change, against what core then does with it: a form
// that lets a change through must be one core takes, and one it holds back must be one core refuses or
// leaves alone — the UI never predicts a refusal core would not make, nor misses one it would
import { checkKeyRename, checkNamespaceName, checkNewKeyForm, newKeyInput, newKeyRulesOf } from '@linguify/table'
import { describe, expect, it } from 'vitest'
import { openProject } from '../setup/caller'

const en = {
	common: { save: 'Save', cancel: 'Cancel', menu: { file: 'File' }, list: { first: 'First' } },
	home: { title: 'Home' }
}
const ckb = { common: { save: '', menu: 'مێنیو' }, extra: { only: 'تەنها' } }

const projects = {
	'one file per locale': {
		'linguify.config.json': { locales: ['en', 'ckb'] },
		'locales/en.json': en,
		'locales/ckb.json': ckb
	},
	'one file per locale, keys.createNamespace on': {
		'linguify.config.json': { locales: ['en', 'ckb'], keys: { createNamespace: true } },
		'locales/en.json': en,
		'locales/ckb.json': ckb
	},
	'a folder per locale, keys.createNamespace on': {
		'linguify.config.json': {
			locales: ['en', 'ckb'],
			options: { fileStructure: 'multi-file' },
			keys: { createNamespace: true }
		},
		'locales/en/common.json': en.common,
		'locales/en/home.json': en.home,
		'locales/ckb/common.json': ckb.common,
		'locales/ckb/extra.json': ckb.extra
	},
	'no namespaces': {
		'linguify.config.json': { locales: ['en', 'ckb'], options: { namespaces: false } },
		'locales/en.json': { save: 'Save', menu: { file: 'File' }, list: { first: 'First' } },
		'locales/ckb.json': { save: '', menu: 'مێنیو', only: 'تەنها' }
	}
} as const

const paths = [
	'common.save',
	'common.delete',
	'common.menu',
	'common.menu.edit',
	'common.menu.file.deeper',
	'common.save.label',
	'common.list.inner',
	'list.inner',
	'extra.only',
	'extra.more',
	'account.name',
	'account.deep.name',
	'Common.x',
	'CON.x',
	'home',
	'save',
	'menu.edit',
	'only',
	'',
	'common..x',
	'.x',
	'common.__proto__',
	'constructor.x',
	'common.\u001b[31m',
	'common.‮evil',
	'هاوبەش.پاشەکەوتکردن'
]

const names = [
	'common',
	'extra',
	'account',
	'Account',
	'Common',
	'CON',
	'a.b',
	'',
	'__proto__',
	'x\u0007',
	'هاوبەش',
	'home'
]

/**
 * the project's catalogue and rules, read as the UI reads them: `config.get` and `catalogue.get`
 */
const asTheUiSees = async (files: Readonly<Record<string, unknown>>) => {
	const project = await openProject(files)
	const config = await project.api.config.get()
	const { catalogue } = await project.api.catalogue.get()
	return { api: project.api, catalogue, rules: { ...newKeyRulesOf(config), defaultLocale: config.config.default } }
}

/**
 * @returns whether core makes the change — a dry run that reports one; a refusal or a warning alone is no
 */
const taken = (call: Promise<{ report: { changes: unknown[] } }>) =>
	call.then(
		result => result.report.changes.length > 0,
		() => false
	)

describe.each(Object.entries(projects))('%s', (_, files) => {
	it('the new-key form lets a key through exactly when key add takes it', async () => {
		const { api, catalogue, rules } = await asTheUiSees(files)
		const disagreements: string[] = []
		const verdicts = new Set<boolean>()
		for (const path of paths) {
			const key = { path, description: '', texts: { en: 'Text', ckb: 'دەق' } }
			const { ready } = checkNewKeyForm(catalogue, key, rules)
			const core = await taken(api.key.add({ ...newKeyInput(key), dryRun: true }))
			verdicts.add(core)
			if (ready !== core)
				disagreements.push(
					`${JSON.stringify(path)}: the form ${ready ? 'sends it' : 'holds it'}, core ${core ? 'takes it' : 'does not'}`
				)
		}
		expect(disagreements).toEqual([])
		// both kinds of case were tried: some taken, some not
		expect(verdicts.size).toBe(2)
	})

	it('the rename form lets a rename through exactly when key rename takes it', async () => {
		const { api, catalogue, rules } = await asTheUiSees(files)
		const disagreements: string[] = []
		const verdicts = new Set<boolean>()
		// what the table offers to rename: a key or group there, in one locale at least
		for (const from of rules.namespaced
			? ['common.save', 'common.menu', 'common.list', 'extra.only']
			: ['save', 'menu', 'list', 'only']) {
			for (const to of paths) {
				const { ready } = checkKeyRename(catalogue, from, to, rules)
				const core = await taken(api.key.rename({ from, to, dryRun: true }))
				verdicts.add(core)
				if (ready !== core)
					disagreements.push(
						`${from} → ${JSON.stringify(to)}: the form ${ready ? 'sends it' : 'holds it'}, core ${core ? 'takes it' : 'does not'}`
					)
			}
		}
		expect(disagreements).toEqual([])
		// both kinds of case were tried: some taken, some not
		expect(verdicts.size).toBe(2)
	})

	it('the namespace form lets a name through exactly when namespace add and rename take it', async () => {
		const { api, catalogue, rules } = await asTheUiSees(files)
		const disagreements: string[] = []
		const verdicts = new Set<boolean>()
		for (const name of names) {
			const added = await taken(api.namespace.add({ name, dryRun: true }))
			const renamed = await taken(api.namespace.rename({ from: 'common', to: name, dryRun: true }))
			verdicts.add(added).add(renamed)
			// the table offers no namespace action in a project without namespaces
			if (!rules.namespaced) continue
			const add = checkNamespaceName(catalogue, name, { namespaceFiles: rules.namespaceFiles })
			if (add.ready !== added)
				disagreements.push(
					`add ${JSON.stringify(name)}: the form ${add.ready ? 'sends it' : 'holds it'}, core ${added ? 'takes it' : 'does not'}`
				)
			const rename = checkNamespaceName(catalogue, name, { from: 'common', namespaceFiles: rules.namespaceFiles })
			if (rename.ready !== renamed)
				disagreements.push(
					`rename common → ${JSON.stringify(name)}: the form ${rename.ready ? 'sends it' : 'holds it'}, core ${renamed ? 'takes it' : 'does not'}`
				)
		}
		expect(disagreements).toEqual([])
		// both kinds of case were tried — some taken, some not — and core takes none without namespaces
		expect([...verdicts].sort()).toEqual(rules.namespaced ? [false, true] : [false])
	})
})
