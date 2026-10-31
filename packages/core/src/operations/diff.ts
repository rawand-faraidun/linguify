import { errorCodes, translationGaps } from '@linguify/constants'
import { flattenTree, localeOrder, translationGap } from '@linguify/keys'
import type { Catalogue, KeyPath, Locale } from '@linguify/types'
import { ValidationError } from '../errors'
import { getOwn } from '../utils'
import type { OperationContext } from './context'
import { requireLocale } from './guards'

/**
 * `diff`'s input
 */
export type DiffInput = {
	/**
	 * compare only this locale against the default
	 */
	locale?: Locale | undefined
}

/**
 * how one locale differs from the default locale
 */
export type LocaleDiff = {
	locale: Locale

	/**
	 * keys the default has and this locale does not
	 */
	missing: KeyPath[]

	/**
	 * keys this locale has and the default does not
	 */
	extra: KeyPath[]

	/**
	 * keys present in both but empty here
	 */
	empty: KeyPath[]
}

/**
 * compares each locale with the default locale
 *
 * @note `missing` is what `sync` adds, `extra` what `sync --remove-unused` removes. Only translations
 * count: a key holding text in one locale and nested keys in another is missing on one side and extra
 * on the other
 *
 * @param context - the operation context
 * @param catalogue - the catalogue
 * @param input - `diff`'s input
 *
 * @returns one entry per locale other than the default, in config order — or only `locale`'s
 *
 * @throws {@link NotFoundError} `LOCALE_UNKNOWN` when `locale` is not configured
 * @throws {@link ValidationError} `INVALID_INPUT` when `locale` is the default locale itself
 */
export const diff = (context: OperationContext, catalogue: Catalogue, input: DiffInput = {}): LocaleDiff[] => {
	const { config } = context
	if (input.locale !== undefined) {
		requireLocale(context, input.locale)
		if (input.locale === config.default) {
			throw new ValidationError(
				`\`${input.locale}\` is the default locale — \`diff\` compares the other locales against it`,
				{ code: errorCodes.invalidInput, details: { locale: input.locale } }
			)
		}
	}

	const source = flattenTree(catalogue.locales[config.default] ?? {})
	const targets = input.locale === undefined ? localeOrder(config).slice(1) : [input.locale]
	return targets.map(locale => {
		const target = flattenTree(catalogue.locales[locale] ?? {})
		// the one rule the studio's marks and counters use too
		const gap = (key: KeyPath) => translationGap(getOwn(source, key), getOwn(target, key))
		return {
			locale,
			missing: Object.keys(source).filter(key => gap(key) === translationGaps.missing),
			extra: Object.keys(target).filter(key => gap(key) === translationGaps.extra),
			empty: Object.keys(source).filter(key => gap(key) === translationGaps.empty)
		}
	})
}
