import { compareKeyPaths, sortTree } from '@linguify/keys'
import type { Catalogue, Locale, TranslationTree } from '@linguify/types'
import type { OperationContext } from './context'
import type { OperationResult } from './report'

/**
 * sorts every locale's keys at every depth, and the descriptions by key path — the only operation that
 * sorts
 *
 * @note what it changes is the files, not the keys: the indentation, style and final newline come from
 * serialising, so a file that is sorted but laid out differently still changes. The report therefore
 * lists no key changes; the write plan is the answer, and an empty one means everything is formatted —
 * which is `format --check`. Plan it with `create: false` — a locale without a file is `sync`'s job —
 * and `anyLineEnding: true`, so a checkout with Windows line endings is not reported as unformatted
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 *
 * @returns the sorted catalogue, and an empty report
 */
export const format = ({ config }: OperationContext, catalogue: Catalogue): OperationResult => ({
	catalogue: {
		locales: Object.fromEntries(
			config.locales.map((locale): [Locale, TranslationTree] => [locale, sortTree(catalogue.locales[locale] ?? {})])
		),
		descriptions: Object.fromEntries(Object.entries(catalogue.descriptions).sort(([a], [b]) => compareKeyPaths(a, b)))
	},
	report: { changes: [], warnings: [] }
})
