import type { AppRouter } from '@linguify/api'
import { bridgeMessageType } from '@linguify/constants'
import type { BridgeReply, BridgeRequest } from '@linguify/types'
import { TRPCClientError, type TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import { vscode } from './page'

/**
 * this page load's own name: the editor reloads a hidden panel's page, and a reply still on its way to the
 * last load must not be taken for one of this load's calls
 */
const session = crypto.randomUUID()

/**
 * each call waiting for its reply, by its number
 */
const waiting = new Map<number, (reply: BridgeReply) => void>()
let calls = 0

window.addEventListener('message', ({ data }: MessageEvent<unknown>) => {
	if (typeof data !== 'object' || data === null) return
	const reply = data as Partial<BridgeReply>
	if (reply.type !== bridgeMessageType || reply.session !== session || typeof reply.id !== 'number') return
	waiting.get(reply.id)?.(reply as BridgeReply)
	waiting.delete(reply.id)
})

/**
 * the webview's tRPC link: each call posted to the extension host and answered there in-process — no
 * network, which the page's policy refuses anyway
 *
 * @note a reply carries a tRPC response, so a refusal arrives as the same `TRPCClientError` the studio
 * gets over HTTP, its linguify code in `data.linguify`
 *
 * @returns the link
 */
export const bridgeLink =
	(): TRPCLink<AppRouter> =>
	() =>
	({ op }) =>
		observable(observer => {
			const id = ++calls
			waiting.set(id, ({ envelope }) => {
				if ('error' in envelope) observer.error(TRPCClientError.from(envelope))
				else {
					observer.next({ result: envelope.result })
					observer.complete()
				}
			})
			const request: BridgeRequest = {
				type: bridgeMessageType,
				session,
				id,
				path: op.path,
				kind: op.type === 'mutation' ? 'mutation' : 'query',
				input: op.input
			}
			vscode.postMessage(request)
			return () => waiting.delete(id)
		})
