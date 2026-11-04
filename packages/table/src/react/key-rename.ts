import { type FormEvent, useRef, useState } from 'react'
import { studioDelays } from '@linguify/constants'
import type { Catalogue, KeyPath, KeyRules } from '@linguify/types'
import { checkKeyRename, noteText, stopsAdd } from '../preflight'
import { useSettled } from './new-key'

/**
 * the form that renames a key, or a whole group, as the studio and the extension both keep it — each draws
 * it its own way
 *
 * @note the new path is checked as it is typed, the way core will: usable here, not taken in any locale,
 * not through a text, its namespace there or allowed to be made, and neither the path it has nor one inside
 * it. Submitting does nothing while any of it stands, and takes the keyboard back to the path; the first of
 * it is said aloud once typing pauses. It holds still while it writes; a failure is kept to be said, and
 * the path with it, to try again
 *
 * @param form - the key's path `from`, the `catalogue` as last read, the project's `rules`, `onSubmit`,
 * settled once written, and `onWritten`, once it is
 *
 * @returns the path and its setter, what stands in its way, whether it can be written, what is said aloud,
 * whether it is writing, the failure and how to let it go, `submit`, and the ref the path's field takes
 */
export const useKeyRenameForm = ({
	from,
	catalogue,
	rules,
	onSubmit,
	onWritten
}: {
	from: KeyPath
	catalogue: Catalogue
	rules: KeyRules & { createNamespace: boolean }
	onSubmit: (to: KeyPath) => Promise<unknown>
	onWritten: (to: KeyPath) => void
}) => {
	const [path, setPath] = useState(from)
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<{ error: unknown }>()
	const field = useRef<HTMLInputElement>(null)
	const check = checkKeyRename(catalogue, from, path, rules)
	const blocking = check.notes.find(stopsAdd)
	const spoken = useSettled(blocking === undefined || path === from ? '' : noteText(blocking), studioDelays.saying)
	const submit = async (event: FormEvent) => {
		event.preventDefault()
		if (pending) return
		if (!check.ready) {
			// back on the path, which is read with what stands in its way
			field.current?.focus()
			return
		}
		setPending(true)
		setFailure(undefined)
		try {
			await onSubmit(path)
			setPending(false)
			onWritten(path)
		} catch (error) {
			// reported once for every write, and said here; what was typed stays to try again
			setFailure({ error })
			setPending(false)
		}
	}
	return {
		path,
		setPath,
		notes: check.notes,
		ready: check.ready && !pending,
		spoken,
		pending,
		failure,
		/**
		 * lets the failure go, once refreshed — the keyboard back on the path, to make the change again
		 */
		refreshed: () => {
			setFailure(undefined)
			field.current?.focus()
		},
		submit,
		field
	}
}
