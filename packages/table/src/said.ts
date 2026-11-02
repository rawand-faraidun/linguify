import { compositionKeyCode, deleteListLimit, namespaceActions, studioText } from '@linguify/constants'
import type { KeyPath, Locale, Report } from '@linguify/types'
import type { NamespaceAction } from './preflight'
import { withWarnings } from './report'
import { countKeys, fill, numbers, plural } from './words'

/**
 * @param event - a key's native event
 *
 * @returns whether an input method is composing — its Enter and Escape are its own, not the form's
 */
export const isComposing = (event: { isComposing: boolean; keyCode: number }): boolean =>
	event.isComposing || event.keyCode === compositionKeyCode

/**
 * what a bulk delete's confirmation says, the studio's and the extension's alike
 *
 * @param keys - the keys it would remove
 * @param hidden - how many of them the view does not show
 * @param locales - every locale
 *
 * @returns its title; what it does, and how many it removes out of sight; the keys it lists — the first
 * `deleteListLimit` — and how many more there are, in words, when it lists only some
 */
export const deleteText = (keys: readonly KeyPath[], hidden: number, locales: readonly Locale[]) => ({
	title: fill(studioText.deleteTitle, { keys: countKeys(keys.length) }),
	description: [
		fill(studioText.deleteDescription, { locales: locales.join(studioText.listSeparator) }),
		...(hidden > 0
			? [plural(hidden === keys.length ? studioText.deleteAllHidden : studioText.deleteHidden, hidden)]
			: [])
	].join(' '),
	listed: keys.slice(0, deleteListLimit),
	more:
		keys.length > deleteListLimit
			? fill(studioText.andMore, { count: numbers.format(keys.length - deleteListLimit) })
			: undefined
})

/**
 * @param report - what core reported of a bulk delete
 *
 * @returns what it did, in words, then what it left and why
 */
export const deletedText = (report: Report): string =>
	withWarnings(fill(studioText.deleted, { keys: countKeys(report.changes.length) }), report)

/**
 * @param added - the key last added, and whether the view hides it
 *
 * @returns what the add form says of it, or nothing once the next key is begun
 */
export const addedText = (added: { key: KeyPath; hidden: boolean } | undefined): string | undefined =>
	added === undefined ? undefined : fill(added.hidden ? studioText.addedHidden : studioText.added, { key: added.key })

/**
 * @param action - adding a namespace, or renaming one
 * @param pending - whether its write is under way
 *
 * @returns what the namespace dialog says: its title, what it does, and its button
 */
export const namespaceDialogText = (action: NamespaceAction, pending: boolean) =>
	action.kind === namespaceActions.rename
		? {
				title: fill(studioText.renameNamespace, { name: action.from }),
				description: studioText.renameNamespaceDescription,
				button: pending ? studioText.renaming : studioText.rename
			}
		: {
				title: studioText.addNamespaceTitle,
				description: studioText.addNamespaceDescription,
				button: pending ? studioText.adding : studioText.add
			}

/**
 * @param selected - how many keys are selected
 * @param said - what the last write did, until the next selection begins or the next edit
 *
 * @returns the status beside Delete: how many are selected, then what was done
 */
export const selectionStatus = (selected: number, said: string | undefined): string =>
	[selected > 0 ? fill(studioText.selectedCount, { keys: countKeys(selected) }) : undefined, said]
		.filter(part => part !== undefined)
		.join(studioText.countSeparator)
