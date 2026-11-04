import { styleText } from 'node:util'
import type { createCaller } from '@linguify/api'
import { configLayerNames, configLayers, configPathSeparator } from '@linguify/constants'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { respond } from '../lib/output'
import { printable } from '../lib/render/text'

/**
 * what `config.get` returns
 */
type ConfigView = Awaited<ReturnType<ReturnType<typeof createCaller>['config']['get']>>

/**
 * `linguify config`
 */
export const configCommand = new Command('config')
	.description('Print the resolved config, the file it came from, and which layer set each value')
	.action((_options, command: Command) => respond(command, () => callerFor(command).config.get(), renderConfig))

/**
 * @param view - the loaded config
 *
 * @returns the file and locales folder, then one row per value — path, value, and the layer that set
 * it, the values no layer set dimmed
 */
const renderConfig = ({ config, sources, file, localesDirectory }: ConfigView): string => {
	const rows = leaves(config).map(([path, value]) => {
		const layer = sources[path] ?? configLayers.default
		return {
			path: printable(path),
			value: printable(value),
			layer: configLayerNames[layer],
			defaulted: layer === configLayers.default
		}
	})
	const width = (column: 'path' | 'value') => Math.max(column.length, ...rows.map(row => row[column].length))
	const [pathWidth, valueWidth] = [width('path'), width('value')]
	const style = { stream: process.stdout }
	const line = (path: string, value: string, layer: string) =>
		`${path.padEnd(pathWidth)}  ${value.padEnd(valueWidth)}  ${layer}`
	return [
		`${styleText('bold', 'config', style)}   ${printable(file)}`,
		`${styleText('bold', 'locales', style)}  ${printable(localesDirectory)}`,
		'',
		styleText('dim', line('path', 'value', 'set by'), style),
		...rows.map(row => {
			const text = line(row.path, row.value, row.layer)
			return row.defaulted ? styleText('dim', text, style) : text
		}),
		''
	].join('\n')
}

/**
 * @param value - a config object
 * @param prefix - the path so far
 *
 * @returns every leaf as its dotted path and its value as text — a list joined by commas
 */
const leaves = (value: object, prefix: string[] = []): [string, string][] =>
	Object.entries(value).flatMap(([key, child]): [string, string][] => {
		const path = [...prefix, key]
		if (child !== null && typeof child === 'object' && !Array.isArray(child)) return leaves(child, path)
		const text = Array.isArray(child) ? child.join(', ') : typeof child === 'string' ? child : JSON.stringify(child)
		return [[path.join(configPathSeparator), text]]
	})
