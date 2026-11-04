import { bridgeCallKinds, bridgeMessageType, bridgeProcedures } from '@linguify/constants'
import type { BridgeReply } from '@linguify/types'
import { callTRPCProcedure, getErrorShape, getTRPCErrorFromUnknown, TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Context } from './context'
import { appRouter } from './router'

/**
 * what names a call: its page load and its number — enough to answer even a call that is not well formed
 */
const bridgeCall = z.object({
	type: z.literal(bridgeMessageType),
	session: z.string().min(1).max(64),
	id: z.number().int().nonnegative()
})

/**
 * a call from the webview, as the host accepts it — anything else on the channel is not the bridge's
 *
 * @note `input` may be missing: the editor carries messages as JSON, which drops a call's `undefined` input
 */
const bridgeRequest = bridgeCall
	.extend({
		path: z.string().min(1),
		kind: z.enum(bridgeCallKinds),
		input: z.unknown().optional()
	})
	.strict()

/**
 * answers one call from the extension's webview — the extension's whole "server": the procedure is run
 * in-process, as `createCaller` runs it, with no port and no HTTP
 *
 * @note the webview is a browser page, so nothing it sends is trusted: a message that is not a bridge call
 * is not answered, a call that is not well formed is refused, a procedure outside {@link bridgeProcedures}
 * is refused as if it did not exist — `export` and `import` take any path — a read sent as a write is refused
 * by tRPC, and the input goes through the procedure's own contract like any other caller's. Errors
 * are shaped by the API's formatter — no stack, linguify's code in `data.linguify` — so the webview branches
 * on the code as the studio does
 *
 * @param message - what the webview posted
 * @param context - the project the panel belongs to
 *
 * @returns the reply to post back, or `undefined` for a message that is not a bridge call
 */
export const answerBridge = async (message: unknown, context: Context): Promise<BridgeReply | undefined> => {
	const call = bridgeCall.safeParse(message)
	if (!call.success) return undefined
	const { session, id } = call.data
	const parsed = bridgeRequest.safeParse(message)
	const { path, kind, input } = parsed.success
		? parsed.data
		: { path: '', kind: bridgeCallKinds.query, input: undefined }
	try {
		if (!parsed.success)
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not a well-formed call', cause: parsed.error })
		if (!bridgeProcedures.includes(path))
			throw new TRPCError({ code: 'NOT_FOUND', message: `No procedure the editor's panel may call on path "${path}"` })
		const data = await callTRPCProcedure({
			router: appRouter,
			path,
			getRawInput: async () => input,
			ctx: context,
			type: kind,
			signal: undefined,
			batchIndex: 0
		})
		return { type: bridgeMessageType, session, id, envelope: { result: { data } } }
	} catch (cause) {
		const error = getTRPCErrorFromUnknown(cause)
		const shape = getErrorShape({ config: appRouter._def._config, error, type: kind, path, input, ctx: context })
		return { type: bridgeMessageType, session, id, envelope: { error: shape } }
	}
}
