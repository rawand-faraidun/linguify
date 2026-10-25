import { appName } from './app'

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
 * browser storage keys, namespaced so they never collide with another app on the same origin
 */
export const storageKeys = {
	theme: `${appName}:theme`,
	viewMode: `${appName}:view-mode`
} as const
