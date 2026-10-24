import { listKeysInput } from '@linguify/api'
import { appName, cliFlags, cliInputFlags, cliTextMarkers } from '@linguify/constants'
import type { LocaleList } from '@linguify/core'
import type { KeyRow, Locale, NamespaceName } from '@linguify/types'
import { Command } from 'commander'
import { callerFor } from '../../lib/caller'
import { respond } from '../../lib/output'
import { type Cell, renderTable } from '../../lib/render/table'
import {
	atTerminal,
	columnWidth,
	counted,
	dim,
	markerFor,
	padToWidth,
	printable,
	showText,
	summary
} from '../../lib/render/text'

/**
 * `linguify list locales`
 */
const localesCommand = new Command('locales')
	.description('Print the configured locales, the default marked')
	.action((_options, command: Command) => respond(command, () => callerFor(command).list.locales(), renderLocales))

/**
 * `linguify list namespaces`
 */
const namespacesCommand = new Command('namespaces')
	.description("Print every namespace any locale has, the default locale's first")
	.action((_options, command: Command) =>
		respond(command, () => callerFor(command).list.namespaces(), renderNamespaces)
	)

/**
 * `linguify list keys`
 */
const keysCommand = new Command('keys')
	.description("Print every key, the default locale's first, so a key only another locale has shows too")
	.option(cliInputFlags.locale, listKeysInput.shape.locale.description)
	.option(cliFlags.table.flags, cliFlags.table.description)
	.action((options: { locale?: Locale; table?: boolean }, command: Command) => {
		const caller = callerFor(command)
		const everyLocale = options.table === true && options.locale === undefined
		// the table's columns, set once the work has run: every configured locale, even one with no keys
		// yet, or the one asked for — the rows alone cannot tell, and `--json` prints the rows alone
		let columns: Locale[] = options.locale === undefined ? [] : [options.locale]
		return respond(
			command,
			async () => {
				const [rows, list] = await Promise.all([
					caller.list.keys(options.locale === undefined ? undefined : { locale: options.locale }),
					everyLocale ? caller.list.locales() : undefined
				])
				if (list !== undefined) columns = list.locales
				return rows
			},
			rows => (options.table === true ? renderKeyTable(rows, columns) : renderKeys(rows, options.locale))
		)
	})

/**
 * `linguify list` — `locales`, `namespaces` or `keys`
 */
export const listCommand = new Command('list')
	.description('Print the locales, the namespaces or the keys')
	.addCommand(localesCommand)
	.addCommand(namespacesCommand)
	.addCommand(keysCommand)

/**
 * @param list - the locales and the default
 *
 * @returns one locale per line — at a terminal, the default marked
 */
const renderLocales = ({ locales, default: defaultLocale }: LocaleList): string =>
	listing(
		locales.map(locale =>
			locale === defaultLocale && atTerminal() ? `${locale} ${dim(cliTextMarkers.default)}` : locale
		),
		[counted(locales.length, 'locale')]
	)

/**
 * @param namespaces - every namespace
 *
 * @returns one namespace per line
 */
const renderNamespaces = (namespaces: NamespaceName[]): string =>
	listing(
		namespaces.map(namespace => printable(namespace)),
		[counted(namespaces.length, 'namespace')],
		`No namespaces yet — \`${appName} namespace add <name>\` adds one`
	)

/**
 * @param rows - every key
 * @param locale - the one locale whose text to show, if one was asked for
 *
 * @returns one key per line — with a locale, each key's text beside it; at a terminal, a missing or
 * empty one marked
 */
const renderKeys = (rows: KeyRow[], locale: Locale | undefined): string => {
	const nothingYet = `No keys yet — \`${appName} key add <path>\` adds one`
	const keys = rows.map(row => printable(row.key))
	if (locale === undefined) return listing(keys, [counted(rows.length, 'key')], nothingYet)

	const width = Math.max(0, ...keys.map(columnWidth))
	const texts = rows.map(row => row.values[locale])
	const missing = texts.filter(text => text === undefined).length
	const empty = texts.filter(text => text === '').length
	return listing(
		keys.map((key, index) => `${padToWidth(key, width)}  ${showText(texts[index])}`.trimEnd()),
		[
			`${counted(rows.length, 'key')} in ${locale}`,
			...(missing > 0 ? [`${missing} missing`] : []),
			...(empty > 0 ? [`${empty} empty`] : [])
		],
		nothingYet
	)
}

/**
 * @param rows - every key
 * @param locales - the locales to show a column for
 *
 * @returns a table — the key, its description when any key has one, then each locale's text, a missing
 * or empty one marked; a table is for reading, so it keeps its markers even when piped
 */
const renderKeyTable = (rows: KeyRow[], locales: Locale[]): string => {
	const described = rows.some(row => row.description !== undefined)
	return renderTable(
		['key', ...(described ? ['description'] : []), ...locales],
		rows.map(row => [
			{ text: printable(row.key) },
			...(described ? [{ text: printable(row.description ?? '', true) }] : []),
			...locales.map((locale): Cell => {
				const text = row.values[locale]
				const marker = markerFor(text)
				return marker === undefined ? { text: printable(text ?? '', true) } : { text: marker, dim: true }
			})
		])
	)
}

/**
 * @param items - the listing, one item per line
 * @param facts - what the closing summary says
 * @param nothingYet - what to say instead when there is nothing to list
 *
 * @returns the output, ending in a line break; piped, the items alone — nothing at all when there are
 * none
 */
const listing = (items: string[], facts: string[], nothingYet?: string): string => {
	const all =
		items.length === 0 && nothingYet !== undefined
			? atTerminal()
				? [dim(nothingYet)]
				: []
			: [...items, ...summary(...facts)]
	return all.length === 0 ? '' : `${all.join('\n')}\n`
}
