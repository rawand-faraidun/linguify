/**
 * the engine a config uses when it names none
 *
 * @note the engine itself — its id, file extension and option defaults — lives in its own folder in
 * `core/src/engines`, so adding an engine never touches this package; the registry refuses to start
 * if this id is not registered
 */
export const defaultEngineId = 'json'

/**
 * what an engine id may look like — lowercase letters, digits and `-`, starting with a letter: `json`
 */
export const engineIdPattern = /^[a-z][a-z0-9-]*$/

/**
 * how an engine can lay out a locale on disk; each engine declares which of these it supports
 */
export const fileStructures = {
	/**
	 * one file per locale — `en.json`
	 */
	single: 'single-file',

	/**
	 * one folder per locale, one file per namespace — `en/common.json`
	 */
	multi: 'multi-file'
} as const

/**
 * the characters a written file can be indented with
 */
export const indentationStyles = {
	space: 'space',
	tab: 'tab'
} as const
