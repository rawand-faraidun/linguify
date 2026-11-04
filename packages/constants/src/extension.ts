import { appName } from './app'

/**
 * the prefix of every editor setting, so options read as `linguify.studio.port`
 */
export const settingsPrefix = appName

/**
 * joins a setting's parts — the prefix, then the config's path to the option
 */
export const settingSeparator = '.'

/**
 * how far each editor setting reaches: per folder, so each root of a multi-root workspace can have its own
 */
export const settingScope = 'resource'

/**
 * the command palette entries the extension contributes
 */
export const extensionCommands = {
	open: `${appName}.open`,
	sync: `${appName}.sync`,
	format: `${appName}.format`,
	diff: `${appName}.diff`,
	export: `${appName}.export`,
	import: `${appName}.import`,
	chooseProject: `${appName}.chooseProject`
} as const

/**
 * the scheme of a file on this machine's disk — the only kind linguify reads and writes
 */
export const fileScheme = 'file'

/**
 * the webview panel's view type, which the editor uses to restore it after a reload
 */
export const panelViewType = `${appName}.panel`

/**
 * what the panel's page may do: run its script, and submit its forms — the editor sandboxes a page without
 * forms against any submit, so no dialog's Enter or button would reach its own handler
 *
 * @note a form still goes nowhere: the page's policy has `form-action 'none'`
 */
export const panelWebviewOptions = {
	enableScripts: true,
	enableForms: true
} as const

/**
 * the words the extension's commands are shown with in the palette, after its name — `Linguify: Open`
 */
export const extensionCommandTitles = {
	open: 'Open',
	sync: 'Sync',
	format: 'Format',
	diff: 'Diff',
	export: 'Export',
	import: 'Import',
	chooseProject: 'Choose Project'
} as const

/**
 * how many files a palette command's confirmation lists before saying how many more there are — the
 * editor's own dialog does not scroll
 */
export const extensionListLimit = 20

/**
 * the webview's built files: the folder inside the extension's `dist`, and the script and stylesheet in it —
 * fixed names, as the host writes the page that loads them
 */
export const webviewFiles = {
	folder: 'webview',
	script: 'webview.js',
	style: 'webview.css'
} as const

/**
 * the extension's words on screen
 */
export const extensionText = {
	noConfig:
		'No linguify config in this workspace, nor above it. Run “linguify init” in a terminal, then open Linguify again.',
	ofProject: '{text} — {project}',
	allFiles: 'All files',
	reading: 'Reading the translations…',
	freshness: 'Linguify watches nothing: after editing the files by hand or running the CLI, refresh.',
	defaultLocaleIs: 'default {default}',
	localeCount: { one: '{count} locale', other: '{count} locales' },
	defaultBadge: 'default',
	chooseProject: 'Choose the linguify project to work on',
	chooseProjectHint: 'Asked once for this workspace — Linguify: Choose Project asks again',
	settingsChanged: 'Linguify settings changed.',
	reload: 'Reload'
} as const

/**
 * the API procedures the webview may call — exactly what the panel reads and writes, no more. `export` and
 * `import` name files anywhere, and `init` creates a project, so the host runs those itself, with the file
 * the person picks in the editor's own dialog; whole-project writes — `sync`, `format` — are the palette's,
 * asked first in the editor's own modal: a page that could call them could run them unasked
 */
export const bridgeProcedures: readonly string[] = [
	'config.get',
	'catalogue.get',
	'key.add',
	'key.set',
	'key.rename',
	'key.remove',
	'namespace.add',
	'namespace.rename'
]

/**
 * the kinds of call the webview makes to the host: a read, or a write
 */
export const bridgeCallKinds = {
	query: 'query',
	mutation: 'mutation'
} as const

/**
 * the tag on every message between the webview and the extension host
 *
 * @note lets each side ignore messages that other code posts on the same channel
 */
export const bridgeMessageType = `${appName}:rpc`

/**
 * the tag on the message the host posts a panel when a palette command has written its project's files —
 * the panel reads them again
 */
export const bridgeChangedType = `${appName}:changed`

/**
 * the tag on the message a panel posts to have the host run one of its Files menu's actions — sync or
 * format — for the panel's project, asked first in the editor's own modal, as from the palette
 */
export const bridgeCommandType = `${appName}:command`

/**
 * where the extension remembers, for each workspace, the project a person chose among several
 */
export const chosenProjectKey = `${appName}.project`

/**
 * the folders the search for projects leaves out: dependencies, builds and the repository's own
 */
export const projectSearchExcludes = '{**/node_modules/**,**/.git/**,**/dist/**,**/.turbo/**}'

/**
 * how many configs the search for projects reads at most — enough for any monorepo, and a bound on a
 * workspace of thousands of folders
 */
export const projectSearchLimit = 100

/**
 * how long, in milliseconds, the panel's scrolling must pause before where it stopped is kept
 */
export const panelScrollKeptAfter = 200
