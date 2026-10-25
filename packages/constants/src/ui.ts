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
