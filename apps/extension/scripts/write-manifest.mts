import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
	configFileName,
	extensionCommands,
	extensionCommandTitles,
	extensionDisplayName,
	generatedFileFormat,
	panelViewType
} from '@linguify/constants'
import { editorSettings, formatJson, writeFile } from '@linguify/core'

// with --check, nothing is written: a manifest that differs from what would be written fails the run
const checking = process.argv.includes('--check')
const path = join(import.meta.dirname, '../package.json')
const written = await readFile(path, 'utf8')
const manifest = JSON.parse(written)

// a panel left open is restored after a reload, which needs the extension running for it
manifest.activationEvents = [`workspaceContains:**/${configFileName}`, `onWebviewPanel:${panelViewType}`]
manifest.contributes = {
	...manifest.contributes,
	// each command the palette shows, named for the extension — `Linguify: Open`
	commands: Object.entries(extensionCommandTitles).map(([name, title]) => ({
		command: extensionCommands[name as keyof typeof extensionCommandTitles],
		title,
		category: extensionDisplayName
	})),
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
