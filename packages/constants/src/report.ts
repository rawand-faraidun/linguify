/**
 * what an operation did to a key, as listed in its report
 */
export const changeKinds = {
	added: 'added',
	updated: 'updated',
	renamed: 'renamed',
	removed: 'removed'
} as const

/**
 * every warning an operation reports while still succeeding
 *
 * @note a warning never stops the rest of the operation — re-running `key add` or removing a path
 * that is already gone must be safe in scripts
 */
export const warningCodes = {
	/**
	 * `key add` found the key already there and left it unchanged
	 */
	keyExists: 'KEY_EXISTS',

	/**
	 * `namespace add` found the namespace already there and left it unchanged
	 */
	namespaceExists: 'NAMESPACE_EXISTS',

	/**
	 * `key remove` found no key at a path and moved on to the next
	 */
	keyNotFound: 'KEY_NOT_FOUND',

	/**
	 * `sync` found a translation where the default locale has nested keys, or the reverse, and left
	 * it for a person to resolve
	 */
	structureConflict: 'STRUCTURE_CONFLICT'
} as const

/**
 * the ways a locale can differ from the default, in the order they are shown
 */
export const diffKinds = ['missing', 'extra', 'empty'] as const

/**
 * what a diff says, wherever it is shown
 */
export const diffText = {
	title: 'Compare each locale with the default',
	pending: 'Comparing the locales…',
	inSync: 'in sync',
	separator: ' · ',
	onlyDefault: 'There is only the default locale — nothing to compare it with',
	localeInSync: '{locale} is in sync with the default',
	allInSync: 'Every locale is in sync with the default'
} as const
