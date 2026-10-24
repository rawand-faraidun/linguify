import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { writeFile } from '@linguify/core'
import { bundledPackages } from '../tsdown.config'

const resolveFromApi = createRequire(join(import.meta.dirname, '../../../packages/api/package.json'))

const notices = await Promise.all(
	bundledPackages.map(async name => {
		const folder = dirname(resolveFromApi.resolve(`${name}/package.json`))
		const { version, license } = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
		const text = await readFile(join(folder, 'LICENSE'), 'utf8')
		return `## ${name} ${version} — ${license}\n\n${text.trim()}\n`
	})
)

await writeFile(
	join(import.meta.dirname, '../dist/THIRD-PARTY-NOTICES.md'),
	`# Third-party notices\n\nThis package bundles the following code.\n\n${notices.join('\n')}`
)
