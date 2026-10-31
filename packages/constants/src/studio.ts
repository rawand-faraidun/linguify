/**
 * the port the studio binds when neither the config nor `--port` chooses one
 */
export const studioDefaultPort = 5678

/**
 * the ports the studio can bind
 */
export const studioPortRange = {
	min: 1,
	max: 65_535
} as const

/**
 * the only address the studio binds
 *
 * @note loopback only: the studio writes files, so it must never be reachable from the network.
 * Requests whose `Host` is anything else are rejected, which also defeats DNS rebinding
 */
export const studioHost = '127.0.0.1'

/**
 * the other name a browser may use for the studio's address — `localhost` resolves on the machine
 * itself, so no web page can rebind it
 */
export const studioLoopbackName = 'localhost'

/**
 * the most a request to the studio may send: far more than any edit needs, far less than would strain
 * the process
 */
export const studioBodyLimit = 5 * 1024 * 1024

/**
 * the headers on every studio response: no other site may frame it — so no click can be tricked into
 * a delete — and no response is read as another type than it says
 */
export const studioResponseHeaders = {
	'X-Frame-Options': 'DENY',
	'Content-Security-Policy': "frame-ancestors 'none'",
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'no-referrer'
} as const

/**
 * the `Sec-Fetch-Site` values a browser sends for the studio's own requests: from its own page, or typed
 * into the address bar
 */
export const studioFetchSites: readonly string[] = ['same-origin', 'none']

/**
 * the studio server's routes
 */
export const studioRoutes = {
	/**
	 * the tRPC handler serving `@linguify/api`'s router
	 */
	trpc: '/trpc'
} as const

/**
 * the folder inside the cli's `dist` that holds the built studio client
 */
export const studioAssetsDir = 'studio'

/**
 * the studio's words on screen — a phrase with a value in it names the value in braces, `{count}`, so its
 * words stay in one place and in their order
 */
export const studioText = {
	title: 'Linguify studio',
	loading: 'Loading…',
	theme: 'Theme',
	view: 'View',
	expandAll: 'Expand all',
	collapseAll: 'Collapse all',
	key: 'Key',
	description: 'Description',
	defaultLocale: 'default',
	keyCount: { one: 'key', other: 'keys' },
	translations: 'Translations',
	noKeys: 'No keys yet.',
	noMatches: 'No keys match.',
	search: 'Search keys and text',
	clearSearch: 'Clear search',
	namespaces: 'Namespaces',
	untranslated: 'Missing',
	untranslatedCount: '{count} missing',
	extraCount: '{count} extra',
	countSeparator: ' · ',
	listSeparator: ', ',
	chosen: '{label} ({chosen})',
	chosenOf: '{count} of {total}',
	keyTotal: '{count} {keys}',
	matchCount: '{shown} of {total} {keys}',
	clearFilters: 'Clear filters',
	select: 'Select {key}',
	selectGroup: 'Select every key in {name}',
	selectShown: 'Select every key in view',
	selectedCount: '{keys} selected',
	deleteSelected: 'Delete',
	clearSelection: 'Clear selection',
	deleteTitle: 'Delete {keys}?',
	deleteDescription: 'Removed from every locale — {locales} — with descriptions.',
	deleteHidden: {
		one: 'The filter hides one of them, which goes too.',
		other: 'The filter hides {count} of them, which go too.'
	},
	deleteAllHidden: {
		one: 'The filter hides it, and it goes too.',
		other: 'The filter hides them all, and they go too.'
	},
	deleted: 'Deleted {keys}.',
	deleting: 'Deleting…',
	deleteList: 'Keys to delete',
	andMore: '…and {count} more',
	files: 'Files',
	tablePath: 'File, from the folder the studio runs in',
	previewing: 'Working out what it will do…',
	addNamespace: 'Add namespace',
	addNamespaceTitle: 'Add a namespace',
	addNamespaceDescription: 'An empty namespace, in every locale. Its keys are added as any other.',
	renameNamespace: 'Rename namespace {name}',
	renameNamespaceDescription: 'Every key in it moves, in every locale, with its descriptions.',
	namespaceName: 'Namespace name',
	rename: 'Rename',
	adding: 'Adding…',
	renaming: 'Renaming…',
	namespaceSame: 'That is its name already.',
	addedNamespace: 'Added the namespace {name}.',
	addedNamespaceHidden: 'Added the namespace {name}; the filters hide it, as it holds no key yet.',
	renamedNamespace: 'Renamed {from} to {to}.',
	cancel: 'Cancel',
	sortHint: 'Sorting orders the view only; the files are not changed.',
	editHint: 'Press Enter to edit; the arrow keys move between texts.',
	noDescription: 'No description',
	onDisk: 'Now on disk: {text}. Enter saves yours over it; Escape keeps it.',
	editKeys: 'Enter saves, Shift+Enter starts a new line, Escape cancels.',
	editLabel: '{column} of {key}',
	staleTitle: 'The files changed on disk',
	staleDescription: 'Nothing was written. Refresh to read them again, then make the change again.',
	writeFailed: 'Nothing was written',
	addKey: 'Add key',
	addForm: 'Add a key',
	add: 'Add',
	close: 'Close',
	keyPath: 'Key path',
	keyPathHint: 'A key is its namespace, then its name: {example}.',
	defaultRequired: "The default locale's text is required.",
	duplicate: 'Already there, in {locales}.',
	newNamespace: 'Adds the namespace {namespace}.',
	namespaceMissing: 'There is no namespace {namespace}; add it first.',
	added: 'Added {key}.',
	addedHidden: 'Added {key}; the filter hides it.',
	writeUnsure: 'The write may not have finished',
	writeUnsureDescription: 'Refresh to read what is on disk now.',
	absent: 'not in this locale',
	blank: 'blank text',
	readAt: 'Read from disk at',
	freshness: 'Avoid editing the files by hand while the studio runs; if you do, refresh. A new port needs a restart.',
	refresh: 'Refresh',
	refreshFailed: 'The files could not be read again, so what is shown may be out of date. Try again.'
} as const

/**
 * the language the studio's words are in — for the page, and for counting in them
 */
export const studioLanguage = 'en'
