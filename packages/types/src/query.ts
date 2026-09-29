import type { KeyPath, Locale } from './identifiers'

/**
 * `diff`'s input
 */
export type DiffInput = {
	/**
	 * compare only this locale against the default
	 */
	locale?: Locale
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
 * `list keys`' input
 */
export type ListKeysInput = {
	/**
	 * include only this locale's values
	 */
	locale?: Locale
}
