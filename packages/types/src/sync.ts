/**
 * `sync`'s input
 */
export type SyncInput = {
	/**
	 * also remove the keys the default locale no longer has, and their descriptions; falls back to
	 * `sync.removeUnused`
	 */
	removeUnused?: boolean | undefined
}
