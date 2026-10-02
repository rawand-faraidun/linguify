import { configLayerOrder, configLayers, configPathSeparator } from '@linguify/constants'
import type { ConfigLayer, ConfigLayerInputs, ResolvedConfig } from '@linguify/types'
import { collectLeafPaths, type Equal, type Expect, isPlainObject, mergeDeep } from '../utils'
import { type ConfigIssue, invalidConfig, layerNames, toConfigIssue } from './issues'
import { configObject, configSchema } from './schema'

/**
 * a layer the caller supplied, with its raw content
 */
type SuppliedLayer = {
	layer: Exclude<ConfigLayer, typeof configLayers.default>
	content: Record<string, unknown>
}

/**
 * compiles only while {@link ConfigLayerInputs} names exactly the layers a caller can supply
 *
 * @note the input type is spelled out by hand in `@linguify/types` for readability; this keeps it in
 * step with `configLayers`
 */
export type LayerInputsMatchLayers = Expect<Equal<keyof ConfigLayerInputs, SuppliedLayer['layer']>>

/**
 * resolves the config from its layers — defaults ▸ editor settings ▸ project config ▸ flags, later
 * wins — and records which layer set every value
 *
 * @note each layer is only *checked* against the shape; its raw content is what gets merged, so a
 * value a layer leaves out stays absent instead of becoming a default that would outrank a weaker
 * layer. Defaults are applied once, in the final parse, which also runs the rules spanning fields
 *
 * @param inputs - the layers, each as read and unchecked; any may be left out
 *
 * @returns the complete config and the layer each value came from
 *
 * @throws {@link ConfigError} `CONFIG_INVALID` — naming the layer when one is malformed on its own,
 * or for the merged config when only the combination is invalid
 */
export const resolveConfig = (inputs: ConfigLayerInputs): ResolvedConfig => {
	const layers = supplyLayers(inputs)
	const merged = layers.reduce<Record<string, unknown>>((config, { content }) => mergeDeep(config, content), {})
	const result = configSchema.safeParse(merged)
	if (!result.success) {
		const issues = result.error.issues.map(issue => withOrigin(toConfigIssue(issue), issue.path.map(String), layers))
		throw invalidConfig('Invalid config', issues)
	}
	const config = result.data
	const sources = Object.fromEntries(
		collectLeafPaths(config).map(path => [path.join(configPathSeparator), sourceOf(path, layers)] as const)
	)
	return { config, sources }
}

/**
 * checks every supplied layer on its own and normalises it for merging, weakest first
 *
 * @param inputs - the layers as supplied
 *
 * @returns the supplied layers in merge order
 */
const supplyLayers = (inputs: ConfigLayerInputs): SuppliedLayer[] =>
	configLayerOrder
		.filter((layer): layer is SuppliedLayer['layer'] => layer !== configLayers.default)
		.flatMap((layer): SuppliedLayer[] => {
			const content = inputs[layer]
			if (content === undefined) return []

			const checked = configObject.safeParse(content)
			if (!checked.success) {
				throw invalidConfig(`Invalid ${layerNames[layer]}`, checked.error.issues.map(toConfigIssue), { layer })
			}
			return [{ layer, content: expandDescription(content as Record<string, unknown>) }]
		})

/**
 * turns `description: true` / `false` into `{ enabled }` before merging
 *
 * @note so that `false` in one layer and `{ "name": "notes.json" }` in a stronger one stay disabled —
 * merged as they are, the object would replace the boolean and switch descriptions back on
 *
 * @param content - one layer's content
 *
 * @returns the content with `description` in object form
 */
const expandDescription = (content: Record<string, unknown>): Record<string, unknown> =>
	typeof content.description === 'boolean' ? { ...content, description: { enabled: content.description } } : content

/**
 * names the layers behind a problem in the merged config
 *
 * @note a single value is decided by the strongest layer that set it; a group of keys — an unknown key
 * inside `options`, say — may have come from any layer that wrote into it, so all of those are named
 *
 * @param issue - one problem in the merged config
 * @param path - the problem's path, as segments
 * @param layers - the supplied layers, weakest first
 *
 * @returns the issue, with `layers` when any supplied layer touched its path
 */
const withOrigin = (issue: ConfigIssue, path: string[], layers: SuppliedLayer[]): ConfigIssue => {
	const decider = layers.findLast(({ content }) => setsPath(content, path))
	const origin = decider === undefined ? layers.filter(({ content }) => reachesPath(content, path)) : [decider]
	return origin.length === 0 ? issue : { ...issue, layers: origin.map(({ layer }) => layer) }
}

/**
 * whether a layer's content holds anything at a path
 *
 * @param content - one layer's content
 * @param path - the path
 *
 * @returns `true` when every segment of the path exists in the content
 */
const reachesPath = (content: Record<string, unknown>, path: string[]): boolean => {
	let node: unknown = content
	for (const segment of path) {
		if (!isPlainObject(node) || !Object.hasOwn(node, segment) || node[segment] === undefined) return false
		node = node[segment]
	}
	return true
}

/**
 * finds the strongest layer that set a value
 *
 * @param path - the value's path in the resolved config
 * @param layers - the supplied layers, weakest first
 *
 * @returns that layer, or `default` when none set it
 */
const sourceOf = (path: string[], layers: SuppliedLayer[]): ConfigLayer =>
	layers.findLast(({ content }) => setsPath(content, path))?.layer ?? configLayers.default

/**
 * whether a layer's content sets a value — at its path, or by setting a parent to a non-object
 *
 * @param content - one layer's content
 * @param path - the value's path
 *
 * @returns `true` when the layer decides that value
 */
const setsPath = (content: Record<string, unknown>, path: string[]): boolean => {
	let node: unknown = content
	for (const segment of path) {
		if (!isPlainObject(node) || !Object.hasOwn(node, segment) || node[segment] === undefined) return false
		node = node[segment]
		if (!isPlainObject(node)) return true
	}
	return false
}
