import type { AddressInfo } from 'node:net'
import { appRouter, type Context } from '@linguify/api'
import {
	errorCodes,
	fileErrorCodes,
	studioBodyLimit,
	studioFetchSites,
	studioHost,
	studioLoopbackName,
	studioResponseHeaders,
	studioRoutes
} from '@linguify/constants'
import { ConflictError } from '@linguify/core'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

/**
 * how to start the studio
 */
export type StudioOptions = {
	/**
	 * the folder the project is looked for from — the CLI's working folder
	 */
	cwd: string

	/**
	 * a config file to use instead of searching for one — the CLI's `--config`
	 */
	config?: string | undefined

	/**
	 * the port to bind; `0` lets the system choose, as the checks do
	 */
	port: number

	/**
	 * the built studio client's folder; without it, a page saying the client is not built
	 */
	assets?: string | undefined
}

/**
 * a running studio
 */
export type Studio = {
	/**
	 * the address to open — the real one: the port is never changed behind the caller's back
	 */
	url: string

	/**
	 * stops listening, cuts every connection still open, and resolves once closed
	 */
	close: () => Promise<void>
}

/**
 * starts the studio: the API's tRPC router and the client, on the loopback address only
 *
 * @note every request must name the studio itself as its `Host` — `127.0.0.1:<port>` or
 * `localhost:<port>` — and, when it carries an `Origin` or a `Sec-Fetch-Site`, come from the studio's
 * own page: a web page that rebinds its own domain to 127.0.0.1, posts to the studio, frames it or loads
 * it from another site is refused before anything else runs, and no response may be framed. A request
 * that sends a body must send JSON, at most a few MB — a form, text or multipart POST, the kinds a page
 * can send without a preflight, never reaches the tRPC handler, which stays the only body parser
 *
 * @param options - the project, the port, and where the client is
 *
 * @returns the studio's address, and how to stop it
 *
 * @throws {@link ConflictError} `PORT_IN_USE` when the port is taken — never another port silently, so
 * the printed address is the real one
 */
export const startStudio = ({ cwd, config, port, assets }: StudioOptions): Promise<Studio> => {
	const allowed = { hosts: new Set<string>(), origins: new Set<string>() }
	const app = new Hono()
	app.use(async (c, next) => {
		for (const [name, value] of Object.entries(studioResponseHeaders)) c.header(name, value)
		const origin = c.req.header('origin')
		const site = c.req.header('sec-fetch-site')
		if (
			!allowed.hosts.has(c.req.header('host') ?? '') ||
			(origin !== undefined && !allowed.origins.has(origin)) ||
			(site !== undefined && !studioFetchSites.includes(site))
		) {
			return c.text('Forbidden: the studio answers only to itself, on the loopback address', 403)
		}
		const type = c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase()
		if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && type !== 'application/json') {
			return c.text('Unsupported: the studio takes JSON only', 415)
		}
		await next()
	})
	app.use(
		`${studioRoutes.trpc}/*`,
		bodyLimit({
			maxSize: studioBodyLimit,
			onError: c => c.text('Too large: the studio takes requests of a few MB', 413)
		})
	)
	app.all(`${studioRoutes.trpc}/*`, c =>
		fetchRequestHandler({
			router: appRouter,
			endpoint: studioRoutes.trpc,
			req: c.req.raw,
			createContext: (): Context => (config === undefined ? { cwd } : { cwd, config })
		})
	)
	if (assets === undefined) app.get('*', c => c.html(placeholderPage))
	else app.use('*', serveStatic({ root: assets }))

	return new Promise((resolve, reject) => {
		const server = serve({ fetch: app.fetch, hostname: studioHost, port }, ({ port: bound }: AddressInfo) => {
			for (const name of [studioHost, studioLoopbackName]) {
				allowed.hosts.add(`${name}:${bound}`)
				allowed.origins.add(`http://${name}:${bound}`)
			}
			resolve({
				url: `http://${studioHost}:${bound}`,
				close: () =>
					new Promise(done => {
						server.close(() => done())
						// Node closes idle connections itself, but not one left mid-request — an upload refused
						// early — which would keep the studio from ever closing
						if ('closeAllConnections' in server) server.closeAllConnections()
					})
			})
		})
		server.once('error', error => {
			if ('code' in error && error.code === fileErrorCodes.addressInUse) {
				reject(
					new ConflictError(`Port ${port} is already in use. Choose another with --port`, {
						code: errorCodes.portInUse,
						details: { port }
					})
				)
			} else reject(error)
		})
	})
}

/**
 * what the studio shows until the client is built
 */
const placeholderPage =
	'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Linguify studio</title></head><body><h1>Linguify studio</h1><p>The studio is running. Its client is not built yet.</p></body></html>'
