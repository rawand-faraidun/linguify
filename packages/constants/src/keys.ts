/**
 * separates the segments of a key path — `common.buttons.save`
 *
 * @note a segment can therefore never contain this character; the JSON files may, but linguify
 * cannot address such a key
 */
export const keySeparator = '.'

/**
 * the characters a terminal acts on instead of showing: control characters, and the bidi controls that
 * reorder what follows them — U+202E shows `abc` as `cba`
 *
 * @note the zero-width joiner and non-joiner are not among them: Kurdish and other scripts need them
 */
export const unprintableCharacter = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u

/**
 * the key examples, hints and messages show: its namespace, its name and its default text
 */
export const exampleKey = { namespace: 'common', name: 'save', text: 'Save' } as const

/**
 * {@link exampleKey}'s full path, namespace first — `common.save`
 */
export const exampleKeyPath = `${exampleKey.namespace}${keySeparator}${exampleKey.name}`

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
 * why a key path cannot be used — the last two only in some projects
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
	reservedSegment: 'reserved-segment',

	/**
	 * with namespaces on, a path that names only a namespace — a key is its namespace, then its name
	 */
	namespaceOnly: 'namespace-only',

	/**
	 * deeper than a format that cannot nest allows: a namespace and a name at most
	 */
	tooDeep: 'too-deep'
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
