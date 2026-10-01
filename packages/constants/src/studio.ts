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
