import { type Uri, workspace } from 'vscode'
import { type EditorSetting, editorSettings } from '@linguify/core'

/**
 * every editor setting, worked out from the config's schema once
 */
let settings: EditorSetting[] | undefined

/**
 * the editor layer for a project: the `linguify.*` settings the person set — for the folder, the workspace or
 * themselves — and nothing else
 *
 * @note read through `inspect`, so a setting left alone is absent, not VS Code's default: the editor layer
 * sits below the project's config and above linguify's own defaults, and a default standing in it would
 * show as set by the editor, and outrank nothing it should not. Read afresh for each call, so a change
 * takes effect on the next read
 *
 * @param folder - the folder holding the project's config, whose settings apply
 *
 * @returns the layer, as a config object
 */
export const editorLayer = (folder: Uri): Record<string, unknown> => {
	settings ??= editorSettings()
	const scope = workspace.getConfiguration(undefined, folder)
	const layer: Record<string, unknown> = {}
	for (const { key, path } of settings) {
		const set = scope.inspect(key)
		const value = set?.workspaceFolderValue ?? set?.workspaceValue ?? set?.globalValue
		if (value === undefined) continue
		let at = layer
		for (const part of path.slice(0, -1)) {
			const next = at[part]
			if (typeof next !== 'object' || next === null) at[part] = {}
			at = at[part] as Record<string, unknown>
		}
		at[path.at(-1) ?? key] = value
	}
	return layer
}
