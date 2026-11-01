import { type FormEvent, useRef, useState } from 'react'
import { keyPathProblemText, namespaceActions, studioDelays, studioText } from '@linguify/constants'
import type { Catalogue, NamespaceName } from '@linguify/types'
import { checkNamespaceName, type NamespaceAction } from '../preflight'
import { fill } from '../words'
import { useSettled } from './new-key'

/**
 * the form that names a namespace — a new one, or one to rename to — as the studio and the extension both
 * keep it, each drawing it its own way
 *
 * @note the name is checked as it is typed, the way core and the engine will: an unusable name, one already
 * there, and where each namespace is a file, one no file can be named or one differing from another only in
 * case. Submitting does nothing while any of it stands, and takes the keyboard back to the name, read with
 * it; the first of it is said aloud once typing pauses. It holds still while it writes; a failure is kept to
 * be said, and the name with it, to try again
 *
 * @param form - the `action`, the `catalogue` as last read, whether each namespace is a file, `onSubmit`,
 * settled once written, and `onWritten`, once it is
 *
 * @returns the name and its setter, what stands in its way, whether it is the name it renames, whether it
 * can be written, what is said aloud, whether it is writing, the failure and how to let it go, `submit`, and
 * the ref the name's field takes
 */
export const useNamespaceForm = ({
	action,
	catalogue,
	namespaceFiles,
	onSubmit,
	onWritten
}: {
	action: NamespaceAction
	catalogue: Catalogue
	namespaceFiles: boolean
	onSubmit: (name: NamespaceName) => Promise<unknown>
	onWritten: (name: NamespaceName) => void
}) => {
	const renaming = action.kind === namespaceActions.rename ? action.from : undefined
	const [name, setName] = useState(renaming ?? '')
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<{ error: unknown }>()
	const field = useRef<HTMLInputElement>(null)
	const check = checkNamespaceName(catalogue, name, { from: renaming, namespaceFiles })
	const notes = [
		...(name !== '' && check.problem !== undefined ? [keyPathProblemText[check.problem]] : []),
		...(check.taken.length > 0
			? [fill(studioText.duplicate, { locales: check.taken.join(studioText.listSeparator) })]
			: [])
	]
	const spoken = useSettled(notes[0] ?? '', studioDelays.saying)
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (pending) return
		if (!check.ready) {
			// back on the name, which is read with what stands in its way
			field.current?.focus()
			return
		}
		setPending(true)
		setFailure(undefined)
		try {
			await onSubmit(name)
			setPending(false)
			onWritten(name)
		} catch (error) {
			// reported once for every write, and said here; what was typed stays to try again
			setFailure({ error })
			setPending(false)
		}
	}
	return {
		renaming,
		name,
		setName,
		notes,
		same: check.same,
		ready: check.ready && !pending,
		spoken,
		pending,
		failure,
		/**
		 * lets the failure go, once refreshed — the keyboard back on the name, to make the change again
		 */
		refreshed: () => {
			setFailure(undefined)
			field.current?.focus()
		},
		submit,
		field
	}
}
