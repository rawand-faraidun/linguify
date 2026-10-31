import { appName } from './app'
import { keyPathStates, translationGaps } from './keys'
import { changeKinds } from './report'

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
	missing: translationGaps.missing,

	/**
	 * the default has the key and this locale has it blank — still to translate
	 */
	empty: translationGaps.empty,

	/**
	 * this locale has the key and the default does not — what `sync --remove-unused` removes
	 */
	extra: translationGaps.extra,

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

/**
 * what a namespace dialog does
 */
export const namespaceActions = {
	/**
	 * add an empty namespace
	 */
	add: 'add',

	/**
	 * rename one, its keys moving with it
	 */
	rename: 'rename'
} as const

/**
 * how many keys of each kind an operation changed, as the studio and the extension say it
 */
export const changeKindText = {
	[changeKinds.added]: '{count} added',
	[changeKinds.updated]: '{count} updated',
	[changeKinds.renamed]: '{count} renamed',
	[changeKinds.removed]: '{count} removed'
} as const

/**
 * the whole-project actions the studio offers, besides editing keys
 */
export const projectActions = {
	/**
	 * every other locale brought in line with the default
	 */
	sync: 'sync',

	/**
	 * every file sorted and laid out
	 */
	format: 'format',

	/**
	 * keys updated and added from a table
	 */
	import: 'import',

	/**
	 * every key written to a table
	 */
	export: 'export'
} as const

/**
 * what the studio and the extension say of each whole-project action
 *
 * @note sync, format and import rewrite files with no undo — the brief asks that this be said plainly
 */
export const projectActionText = {
	[projectActions.sync]: {
		label: 'Sync…',
		title: 'Sync the locales',
		description:
			"Brings every other locale in line with the default: the keys it has and they lack are added. This can't be undone here; the files' history in git is the way back.",
		button: 'Sync',
		pending: 'Syncing…',
		done: 'Synced: {summary}.'
	},
	[projectActions.format]: {
		label: 'Format…',
		title: 'Format the files',
		description:
			"Sorts the keys and lays out every file as the config says. No text changes. This can't be undone here; the files' history in git is the way back.",
		button: 'Format',
		pending: 'Formatting…',
		done: 'Formatted: {summary}.'
	},
	[projectActions.import]: {
		label: 'Import…',
		title: 'Import a table',
		description:
			"Updates and adds keys from a table. It never removes one, and an empty cell changes nothing. This can't be undone here; the files' history in git is the way back.",
		button: 'Import',
		pending: 'Importing…',
		done: 'Imported: {summary}.'
	},
	[projectActions.export]: {
		label: 'Export…',
		title: 'Export a table',
		description:
			'Writes every key, with its description and every locale, to a table. The translations are not changed.',
		button: 'Export',
		pending: 'Exporting…',
		done: 'Exported {keys} to {path}.'
	}
} as const

/**
 * what a whole-project action's dialog says, beside each action's own words
 */
export const actionText = {
	removeUnused: 'Also remove the extra keys — those the default does not have — and their descriptions',
	tableFormat: 'Table format',
	nothingToDo: 'Nothing to change.',
	writes: 'Writes {files}',
	removes: 'Removes {files}',
	files: 'Files',
	exportPlan: 'Writes {keys} to {path}',
	exportReplaces: 'Writes {keys} to {path}, replacing the earlier export there',
	fileCount: { one: '{count} file', other: '{count} files' },
	nameAFile: 'Name a file.',
	stillWorking: 'Still working out what it will do; press again once it shows.'
} as const

/**
 * how a write the studio made failed
 */
export const writeFailures = {
	/**
	 * refused: the files changed on disk since they were read
	 */
	stale: 'stale',

	/**
	 * refused for any other reason, which linguify gave
	 */
	failed: 'failed',

	/**
	 * no answer came, so it may or may not have finished
	 */
	unsure: 'unsure'
} as const

/**
 * what a whole-project action's dialog knows of what it would do
 */
export const previewStates = {
	/**
	 * the dry run is under way
	 */
	working: 'working',

	/**
	 * the dry run was refused, or nothing can be asked of it yet
	 */
	failed: 'failed',

	/**
	 * the dry run's outcome is in
	 */
	ready: 'ready'
} as const

/**
 * how long the studio waits on a person, in milliseconds: before saying aloud what stands in the way of
 * what they type, and before working out what an action would do with the options they set
 */
export const studioDelays = {
	saying: 500,
	preview: 300
} as const

/**
 * the key code a browser gives a key press that ends a composition — Safari's Enter or Escape as an input
 * method commits its text, which must not save, close or submit
 */
export const compositionKeyCode = 229
