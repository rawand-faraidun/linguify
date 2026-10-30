import { appName } from './app'
import { keyPathProblems, keyPathStates, reservedKeySegments } from './keys'

/**
 * the translation table's layouts, shared by the studio and the extension
 */
export const viewModes = {
	/**
	 * one row per full dotted key
	 */
	flat: 'flat',

	/**
	 * nested keys collapse by path segment
	 */
	tree: 'tree',

	/**
	 * key and default locale only, each row expanding to the rest
	 */
	compact: 'compact'
} as const

/**
 * what a row of the translation table is — and the start of its id, so a namespace section, a tree
 * group and a key never share one, whatever their names
 */
export const rowKinds = {
	/**
	 * a namespace, holding its keys
	 */
	section: 'section',

	/**
	 * a key path segment holding nested keys, in the tree view
	 */
	group: 'group',

	/**
	 * one key, with its text in every locale
	 */
	key: 'key'
} as const

/**
 * between a row's kind and its path in the row's id — `section:common`, `key:common.save`
 */
export const rowIdSeparator = ':'

/**
 * how much of a row is selected — a section or group is `some` while only part of its keys are, which a
 * checkbox shows as a dash
 */
export const selectionStates = {
	all: 'all',
	some: 'some',
	none: 'none'
} as const

/**
 * the table's sort orders — on screen only; sorting never touches the files
 */
export const sortDirections = {
	ascending: 'ascending',
	descending: 'descending'
} as const

/**
 * what a table sorts by: the key path, or a locale's text
 */
export const sortColumns = {
	key: 'key',
	locale: 'locale'
} as const

/**
 * the studio's colour themes
 */
export const themes = {
	light: 'light',
	dark: 'dark',
	system: 'system'
} as const

/**
 * how each colour theme is named on screen
 */
export const themeLabels = {
	[themes.light]: 'Light',
	[themes.dark]: 'Dark',
	[themes.system]: 'System'
} as const

/**
 * how each view mode is named on screen
 */
export const viewModeLabels = {
	[viewModes.flat]: 'Flat',
	[viewModes.tree]: 'Tree',
	[viewModes.compact]: 'Compact'
} as const

/**
 * how a translation table marks one key's text in one locale, when its text alone would not say enough
 */
export const tableMarks = {
	/**
	 * the default has the key and this locale does not — still to translate
	 */
	missing: 'missing',

	/**
	 * the default has the key and this locale has it blank — still to translate
	 */
	empty: 'empty',

	/**
	 * this locale has the key and the default does not — what `sync --remove-unused` removes
	 */
	extra: 'extra',

	/**
	 * this locale lacks the key, and nothing expects it to have it: it is the default, or the default
	 * lacks it too
	 */
	absent: 'absent',

	/**
	 * blank text nothing measures against: the default's own, or an extra key's
	 */
	blank: 'blank'
} as const

/**
 * how each mark reads on screen
 */
export const tableMarkLabels = {
	[tableMarks.missing]: 'missing',
	[tableMarks.empty]: 'empty',
	[tableMarks.extra]: 'extra',
	[tableMarks.absent]: '—',
	[tableMarks.blank]: 'empty'
} as const

/**
 * the classes each mark is drawn with: still to translate in the `missing` token, extra in the `extra`
 * token, the rest muted
 *
 * @note in constants so the studio and the extension draw them alike
 */
export const tableMarkClasses = {
	[tableMarks.missing]: 'bg-missing text-missing-foreground',
	[tableMarks.empty]: 'bg-missing text-missing-foreground',
	[tableMarks.extra]: 'bg-extra text-extra-foreground',
	[tableMarks.absent]: 'text-muted-foreground',
	[tableMarks.blank]: 'text-muted-foreground'
} as const

/**
 * browser storage keys, namespaced so they never collide with another app on the same origin
 */
export const storageKeys = {
	theme: `${appName}:theme`,
	viewMode: `${appName}:view-mode`
} as const

/**
 * letters a search treats as one: each Arabic letter an Arabic keyboard types in place of Kurdish
 * Sorani's own — kaf for keheh, yeh and alef maksura for Farsi yeh — so a search typed on either finds the
 * text
 *
 * @note heh and Kurdish Sorani's ae stay apart: they are different letters
 */
export const searchFolds: Readonly<Record<string, string>> = {
	'\u0643': '\u06a9',
	'\u064a': '\u06cc',
	'\u0649': '\u06cc'
}

/**
 * characters a search ignores: the zero-width non-joiner and the tatweel, which shape text without
 * changing what it says
 */
export const searchIgnored: readonly string[] = ['\u200c', '\u0640']

/**
 * why a key path cannot be used, as the studio and the extension say it
 */
export const keyPathProblemText = {
	[keyPathProblems.empty]: 'Type the key path.',
	[keyPathProblems.emptySegment]: 'A segment is empty: two dots together, or one at either end.',
	[keyPathProblems.reservedSegment]: `${reservedKeySegments.join(', ')} cannot be segments.`,
	[keyPathProblems.namespaceOnly]: 'That names only a namespace; a key is its namespace, then its name.',
	[keyPathProblems.tooDeep]: "This project's format cannot nest keys."
} as const

/**
 * what is in a new key's way, in one locale, as the studio and the extension say it
 */
export const keyConflictText = {
	[keyPathStates.group]: '{at} holds keys of its own in {locale}.',
	[keyPathStates.blocked]: '{at} is a text in {locale}, so no key can go under it.'
} as const

/**
 * the kinds of thing a new key's form says
 */
export const newKeyNotes = {
	/**
	 * the path cannot be used
	 */
	problem: 'problem',

	/**
	 * the key is there already
	 */
	duplicate: 'duplicate',

	/**
	 * nested keys, or a text, in the key's way in a locale
	 */
	conflict: 'conflict',

	/**
	 * the key would start a namespace
	 */
	newNamespace: 'new-namespace',

	/**
	 * the default locale's text is still empty
	 */
	defaultRequired: 'default-required'
} as const
