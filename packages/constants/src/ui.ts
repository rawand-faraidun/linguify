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
