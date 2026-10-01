/**
 * separates the segments of a key path — `common.buttons.save`
 *
 * @note a segment can therefore never contain this character; the JSON files may, but linguify
 * cannot address such a key
 */
export const keySeparator = '.'

/**
 * the value a locale gets for a key it has no translation for
 *
 * @note empty rather than absent, so the key exists in every locale and `diff` reports it as empty
 * instead of missing
 */
export const emptyTranslation = ''

/**
 * segments a key path may never contain
 *
 * @note these name JavaScript's prototype machinery; writing them as keys can rewrite the prototype of
 * every object in the process, and key paths arrive from the browser
 */
export const reservedKeySegments: readonly string[] = ['__proto__', 'prototype', 'constructor']

/**
 * why a key path cannot be used
 */
export const keyPathProblems = {
	/**
	 * the path is empty
	 */
	empty: 'empty',

	/**
	 * two separators in a row, or one at either end — `common..save`, `.save`
	 */
	emptySegment: 'empty-segment',

	/**
	 * a segment is one of {@link reservedKeySegments}
	 */
	reservedSegment: 'reserved-segment'
} as const

/**
 * how `format` orders keys
 *
 * @note a fixed locale, never the machine's: with the machine's locale, `format --check` could pass on
 * one computer and fail on another for the same files. `numeric` puts `item2` before `item10`
 */
export const keyCollation = {
	locale: 'en',
	options: { numeric: true }
} as const

/**
 * what a key path points at in one locale's tree
 */
export const keyPathStates = {
	/**
	 * nothing — a translation can be written there
	 */
	free: 'free',

	/**
	 * a translation already
	 */
	translation: 'translation',

	/**
	 * nested keys; writing a translation there would replace them
	 */
	group: 'group',

	/**
	 * the path runs through a translation, which cannot hold nested keys
	 */
	blocked: 'blocked'
} as const
