import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { configFileName, extensionDisplayName, generatedFileFormat } from '@linguify/constants'
import { editorSettings, formatJson, writeFile } from '@linguify/core'

// with --check, nothing is written: a manifest that differs from what would be written fails the run
const checking = process.argv.includes('--check')
const path = join(import.meta.dirname, '../package.json')
const written = await readFile(path, 'utf8')
const manifest = JSON.parse(written)

manifest.activationEvents = [`workspaceContains:**/${configFileName}`]
manifest.contributes = {
	...manifest.contributes,
	configuration: {
		title: extensionDisplayName,
		properties: Object.fromEntries(editorSettings().map(({ key, schema }, order) => [key, { ...schema, order }]))
	}
}
const expected = formatJson(manifest, generatedFileFormat)

if (!checking) await writeFile(path, expected)
else if (written !== expected) {
	process.stderr.write(
		'apps/extension/package.json is out of date with the config schema. Run `pnpm --filter linguify-vs manifest`\n'
	)
	process.exitCode = 1
}
