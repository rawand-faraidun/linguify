import { useState } from 'react'
import { storageKeys } from '@linguify/constants'
import { isViewMode, usableViewMode } from '@linguify/table'
import type { EngineCapabilities, ViewMode } from '@linguify/types'

/**
 * the table's view mode: the one last picked in this browser, else `studio.defaultView` — either only
 * when the project can use it
 *
 * @param configured - `studio.defaultView`
 * @param capabilities - what the project's format can express
 *
 * @returns the mode to show, and how to pick another, which is remembered
 */
export const useViewMode = (
	configured: ViewMode,
	capabilities: Pick<EngineCapabilities, 'nesting'>
): [ViewMode, (mode: ViewMode) => void] => {
	const [picked, setPicked] = useState(readPicked)
	const pick = (mode: ViewMode) => {
		setPicked(mode)
		try {
			localStorage.setItem(storageKeys.viewMode, mode)
		} catch {}
	}
	return [usableViewMode(picked ?? configured, capabilities), pick]
}

/**
 * @returns the view mode last picked in this browser, if any — nothing when storage is unavailable or
 * holds something else
 */
const readPicked = (): ViewMode | undefined => {
	try {
		const stored = localStorage.getItem(storageKeys.viewMode)
		return isViewMode(stored) ? stored : undefined
	} catch {
		return undefined
	}
}
