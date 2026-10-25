import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { writeFile } from '@linguify/core'
import { bundledPackages } from '../tsdown.config'

// the workspace packages that use the bundled packages, where each is installed
const users = ['../../../packages/api', '../../studio/server'].map(folder =>
	createRequire(join(import.meta.dirname, folder, 'package.json'))
)

/**
 * @param name - a bundled package
 *
 * @returns its folder, from the first workspace package that has it
 */
const folderOf = (name: string): string => {
	for (const user of users) {
		let entry: string
		try {
			entry = user.resolve(name)
		} catch {
			continue
		}
		// a package need not export its package.json, so walk up from its entry to the folder that names it
		for (let folder = dirname(entry); folder !== dirname(folder); folder = dirname(folder)) {
			const manifest = join(folder, 'package.json')
			if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === name) return folder
		}
	}
	throw new Error(`${name} is bundled, but no workspace package that might use it has it installed`)
}

const notices = await Promise.all(
	bundledPackages.map(async name => {
		const folder = folderOf(name)
		const { version, license } = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
		const text = await readFile(join(folder, 'LICENSE'), 'utf8')
		return `## ${name} ${version} — ${license}\n\n${text.trim()}\n`
	})
)

await writeFile(
	join(import.meta.dirname, '../dist/THIRD-PARTY-NOTICES.md'),
	`# Third-party notices\n\nThis package bundles the following code.\n\n${notices.join('\n')}`
)
