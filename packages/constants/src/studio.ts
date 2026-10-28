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
 * the studio's words on screen
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
	absent: 'not in this locale',
	blank: 'blank text',
	readAt: 'Read from disk at',
	freshness: 'Avoid editing the files by hand while the studio runs; if you do, refresh. A new port needs a restart.',
	refresh: 'Refresh'
} as const

/**
 * the language the studio's words are in — for the page, and for counting in them
 */
export const studioLanguage = 'en'
