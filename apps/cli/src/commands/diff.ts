import { styleText } from 'node:util'
import { diffInput } from '@linguify/api'
import { appName, cliFlags, cliInputFlags } from '@linguify/constants'
import type { LocaleDiff } from '@linguify/core'
import type { KeyPath, Locale } from '@linguify/types'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { helpFor, longFlag, readGlobalOptions } from '../lib/options'
import { respond } from '../lib/output'
import { type Cell, renderTable, type TextStyle } from '../lib/render/table'
import { atTerminal, columnWidth, counted, dim, fields, padToWidth, printable, summary } from '../lib/render/text'

/**
 * the ways a locale can differ from the default, in the order they are shown
 */
const kinds = ['missing', 'extra', 'empty'] as const satisfies (keyof LocaleDiff)[]

/**
 * one way a locale differs
 */
type Kind = (typeof kinds)[number]

/**
 * how each kind is coloured at a terminal: what `sync` would add stands out, an empty text least
 */
const kindColours = { missing: 'red', extra: 'yellow', empty: 'dim' } as const satisfies Record<Kind, TextStyle>

/**
 * `linguify diff`
 */
export const diffCommand = new Command('diff')
	.description('Compare each locale with the default: the keys it is missing, has extra, or has empty')
	.option(cliInputFlags.locale, helpFor(diffInput.shape.locale))
	.option(cliFlags.table.flags, cliFlags.table.description)
	.action((options: { locale?: Locale; table?: boolean }, command: Command) => {
		const caller = callerFor(command)
		// the table's row order, set once the work has run: every key, the default's first — the
		// differences alone cannot tell, and `--json` prints the differences alone
		let order: KeyPath[] = []
		return respond(
			command,
			async () => {
				const [diffs, rows] = await Promise.all([
					caller.diff(options.locale === undefined ? undefined : { locale: options.locale }),
					options.table === true && readGlobalOptions(command).json !== true ? caller.list.keys() : undefined
				])
				order = rows?.map(row => row.key) ?? []
				return diffs
			},
			diffs => (options.table === true ? renderDiffTable(diffs, order) : renderDiff(diffs))
		)
	})

/**
 * @param kind - a way a locale differs
 *
 * @returns its name, coloured at a terminal
 */
const showKind = (kind: Kind): string => styleText(kindColours[kind], kind, { stream: process.stdout })

/**
 * @param diff - one locale's differences
 *
 * @returns how many of each kind, the empty kinds left out — `3 missing · 1 empty` — or that it is in sync
 */
const tally = (diff: LocaleDiff): string => {
	const counts = kinds.filter(kind => diff[kind].length > 0).map(kind => `${diff[kind].length} ${kind}`)
	return counts.length === 0 ? 'in sync' : counts.join(' · ')
}

/**
 * @param diffs - each locale's differences
 *
 * @returns at a terminal, each locale with its tally, then its keys by kind — or, when nothing differs,
 * the closing line alone. Piped, one line per
 * difference — locale, kind and key, tab-separated: `ckb\tmissing\tcommon.save` — and nothing else, ready
 * for `grep`, `cut -f` or `awk`
 */
const renderDiff = (diffs: LocaleDiff[]): string => {
	if (!atTerminal()) {
		return diffs
			.flatMap(({ locale, ...lists }) =>
				kinds.flatMap(kind => lists[kind].map(key => `${fields(locale, kind, printable(key))}\n`))
			)
			.join('')
	}
	if (diffs.every(diff => kinds.every(kind => diff[kind].length === 0))) return `${dim(verdict(diffs))}\n`

	const kindWidth = Math.max(...kinds.map(columnWidth))
	const blocks = diffs.map(diff =>
		[
			`${styleText('bold', diff.locale, { stream: process.stdout })}  ${dim(tally(diff))}`,
			...kinds.flatMap(kind => diff[kind].map(key => `  ${padToWidth(showKind(kind), kindWidth)}  ${printable(key)}`))
		].join('\n')
	)
	return `${[blocks.join('\n\n'), ...summary(verdict(diffs))].join('\n')}\n`
}

/**
 * @param diffs - each locale's differences
 *
 * @returns the closing line for a person: nothing to compare, everything in sync, or how many locales
 * are out of sync and which command fixes what — `sync` adds what is missing, `sync --remove-unused`
 * removes what is extra; an empty text only a translator can fill
 */
const verdict = (diffs: LocaleDiff[]): string => {
	if (diffs.length === 0) return 'There is only the default locale — nothing to compare it with'
	const behind = diffs.filter(diff => kinds.some(kind => diff[kind].length > 0))
	if (behind.length === 0) {
		const [only] = diffs
		return diffs.length === 1 && only !== undefined
			? `${only.locale} is in sync with the default`
			: 'Every locale is in sync with the default'
	}
	return [
		`${counted(behind.length, 'locale')} out of sync`,
		...(behind.some(diff => diff.missing.length > 0) ? [`\`${appName} sync\` adds what is missing`] : []),
		...(behind.some(diff => diff.extra.length > 0)
			? [`\`${appName} sync ${longFlag(cliInputFlags.removeUnused)}\` removes what is extra`]
			: [])
	].join(' · ')
}

/**
 * @param diffs - each locale's differences
 * @param order - every key, the default's first
 *
 * @returns a table: one row per key that differs anywhere, in that order, and one column per locale,
 * saying how it differs there. A key the order lacks — a file changed between the two reads — goes
 * last rather than missing. At a terminal the closing line follows; with nothing to show, it stands
 * alone. Piped, the table alone, or nothing
 */
const renderDiffTable = (diffs: LocaleDiff[], order: KeyPath[]): string => {
	const found = new Map<KeyPath, Map<Locale, Kind>>()
	for (const diff of diffs) {
		for (const kind of kinds) {
			for (const key of diff[kind]) found.set(key, (found.get(key) ?? new Map()).set(diff.locale, kind))
		}
	}
	if (found.size === 0) return atTerminal() ? `${dim(verdict(diffs))}\n` : ''
	const keys = [...new Set([...order.filter(key => found.has(key)), ...found.keys()])]
	return `${renderTable(
		['key', ...diffs.map(diff => diff.locale)],
		keys.map((key): Cell[] => [
			{ text: printable(key) },
			...diffs.map((diff): Cell => {
				const kind = found.get(key)?.get(diff.locale)
				return kind === undefined ? { text: '' } : { text: kind, style: kindColours[kind] }
			})
		])
	)}${summary(verdict(diffs))
		.map(line => `${line}\n`)
		.join('')}`
}
