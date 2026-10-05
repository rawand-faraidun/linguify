import type { KeyPath, Locale } from './identifiers'

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
 * `list locales`' result
 */
export type LocaleList = {
	/**
	 * the default locale, the one every other is compared against
	 */
	default: Locale

	/**
	 * every configured locale, in config order
	 */
	locales: Locale[]
}

/**
 * `list keys`' input
 */
export type ListKeysInput = {
	/**
	 * include only this locale's values; every key is still listed, so the ones it lacks show
	 */
	locale?: Locale | undefined
}
