import { changeKinds, emptyTranslation, errorCodes, warningCodes } from '@linguify/constants'
import { flattenTree, joinKeyPath, readNode } from '@linguify/keys'
import type {
	Catalogue,
	KeyChange,
	KeyPath,
	Locale,
	OperationResult,
	SyncInput,
	TranslationNode,
	TranslationTree,
	Warning
} from '@linguify/types'
import { ValidationError } from '../errors'
import { getOwn } from '../utils'
import { localeOrder, type OperationContext } from './context'

/**
 * what a sync of one locale noticed, gathered across every locale for the report
 */
type Findings = {
	added: Map<KeyPath, Locale[]>
	removed: Map<KeyPath, Locale[]>
	warnings: Warning[]
}

/**
 * how one locale is synced
 */
type SyncRules = {
	locale: Locale
	fillWithDefault: boolean
	removeUnused: boolean
	findings: Findings
}

/**
 * brings every other locale in line with the default locale
 *
 * @note never sorts: a locale's keys keep their order, and the keys it gains go at the bottom of their
 * level, in the default's order — only `format` sorts. A new key gets `""`, or the default's text under
 * `keys.fillWithDefault`; a missing namespace or locale gains its keys too, which creates its files.
 * Where one side has a translation and the other nested keys, nothing is overwritten: the locale keeps
 * its own and the report warns. The default locale itself never changes
 *
 * @throws {@link ValidationError} `INVALID_INPUT` when `removeUnused` would empty other locales because
 * the default has no translations at all — a missing file or the wrong default, far more likely than
 * a wish to delete everything
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `sync`'s input
 *
 * @returns the synced catalogue, and the report: one change per key added or removed, with the locales
 * it reached — added keys in the default's order
 */
export const sync = (context: OperationContext, catalogue: Catalogue, input: SyncInput = {}): OperationResult => {
	const { config } = context
	const removeUnused = input.removeUnused ?? config.sync.removeUnused
	const source = catalogue.locales[config.default] ?? {}
	if (removeUnused && Object.keys(flattenTree(source)).length === 0) {
		const others = config.locales.filter(
			locale => locale !== config.default && Object.keys(flattenTree(catalogue.locales[locale] ?? {})).length > 0
		)
		if (others.length > 0) {
			throw new ValidationError(
				`The default locale \`${config.default}\` has no translations, so removing unused keys would empty ${others.map(locale => `\`${locale}\``).join(', ')}. Check its file, or sync without removing`,
				{ code: errorCodes.invalidInput, details: { locale: config.default, locales: others } }
			)
		}
	}
	const findings: Findings = { added: new Map(), removed: new Map(), warnings: [] }

	const synced = new Map(
		localeOrder(config)
			.slice(1)
			.map((locale): [Locale, TranslationTree] => [
				locale,
				syncTree(source, catalogue.locales[locale] ?? {}, [], {
					locale,
					fillWithDefault: config.keys.fillWithDefault,
					removeUnused,
					findings
				})
			])
	)
	const locales = Object.fromEntries(
		config.locales.map((locale): [Locale, TranslationTree] => [
			locale,
			synced.get(locale) ?? catalogue.locales[locale] ?? {}
		])
	)

	const unused = new Set(
		removeUnused ? Object.keys(catalogue.descriptions).filter(key => readNode(source, key) === undefined) : []
	)
	const descriptions =
		unused.size === 0
			? catalogue.descriptions
			: Object.fromEntries(Object.entries(catalogue.descriptions).filter(([key]) => !unused.has(key)))

	const defaultKeys = new Map<KeyPath, Locale[]>()
	record(defaultKeys, source, [], config.default)
	const order = new Map([...defaultKeys.keys()].map((path, index) => [path, index]))
	const changes: KeyChange[] = [
		...[...findings.added]
			.sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
			.map(([path, reached]) => ({ kind: changeKinds.added, path, locales: reached })),
		...[...findings.removed].map(([path, reached]) => ({
			kind: changeKinds.removed,
			path,
			locales: reached,
			...(unused.has(path) ? { description: true as const } : {})
		})),
		...[...unused]
			.filter(path => !findings.removed.has(path))
			.map(path => ({ kind: changeKinds.removed, path, locales: [], description: true as const }))
	]
	return { catalogue: { locales, descriptions }, report: { changes, warnings: findings.warnings } }
}

/**
 * syncs one level of one locale against the same level of the default
 *
 * @param source - the default locale's group
 * @param target - the locale's group at the same path
 * @param prefix - the path of both groups
 * @param rules - the locale, the fill rule, whether to remove unused keys, and where to record findings
 *
 * @returns the synced group: the locale's own keys in their order, then the ones it was missing
 */
const syncTree = (
	source: TranslationTree,
	target: TranslationTree,
	prefix: string[],
	rules: SyncRules
): TranslationTree => {
	const entries: [string, TranslationNode][] = []
	for (const [segment, node] of Object.entries(target)) {
		const path = [...prefix, segment]
		const expected = getOwn(source, segment)
		if (expected === undefined) {
			if (rules.removeUnused) record(rules.findings.removed, node, path, rules.locale)
			else entries.push([segment, node])
		} else if (typeof expected === 'object' && typeof node === 'object') {
			entries.push([segment, syncTree(expected, node, path, rules)])
		} else {
			if (typeof expected !== typeof node) warnConflict(rules, path, expected)
			entries.push([segment, node])
		}
	}
	for (const [segment, node] of Object.entries(source)) {
		if (Object.hasOwn(target, segment)) continue
		entries.push([segment, fill(node, rules.fillWithDefault)])
		record(rules.findings.added, node, [...prefix, segment], rules.locale)
	}
	return Object.fromEntries(entries)
}

/**
 * @param node - the default locale's translation or group
 * @param fillWithDefault - copy the default's text instead of leaving it empty
 *
 * @returns the same shape for another locale
 */
const fill = (node: TranslationNode, fillWithDefault: boolean): TranslationNode =>
	typeof node === 'string'
		? fillWithDefault
			? node
			: emptyTranslation
		: Object.fromEntries(Object.entries(node).map(([segment, child]) => [segment, fill(child, fillWithDefault)]))

/**
 * records every key a node holds — each translation, and each group with nothing in it — as reaching a
 * locale
 *
 * @param into - the added or removed keys so far
 * @param node - the translation or group added or removed
 * @param path - its path
 * @param locale - the locale it happened in
 */
const record = (into: Map<KeyPath, Locale[]>, node: TranslationNode, path: string[], locale: Locale): void => {
	const children = typeof node === 'string' ? [] : Object.entries(node)
	if (children.length === 0) {
		const key = joinKeyPath(path)
		into.set(key, [...(into.get(key) ?? []), locale])
		return
	}
	for (const [segment, child] of children) record(into, child, [...path, segment], locale)
}

/**
 * @param rules - the locale being synced, and where to record the warning
 * @param path - where the two sides disagree
 * @param expected - what the default has there
 */
const warnConflict = ({ locale, findings }: SyncRules, path: string[], expected: TranslationNode): void => {
	const key = joinKeyPath(path)
	const [inDefault, here] =
		typeof expected === 'string' ? ['a translation', 'nested keys'] : ['nested keys', 'a translation']
	findings.warnings.push({
		code: warningCodes.structureConflict,
		path: key,
		message: `\`${key}\` is ${inDefault} in the default locale but ${here} in \`${locale}\`; left as it is`
	})
}
