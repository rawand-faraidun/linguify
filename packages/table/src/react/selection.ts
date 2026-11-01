import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyRow } from '@linguify/types'
import type { TableRow } from '../rows'
import { bulkDelete, keepExisting, type Selection, toggleAll, toggleSelection } from '../selection'

/**
 * the keys a person has ticked, as the studio and the extension both keep them — by path, so a selection
 * outlives a change of view, search, filter or sort, and a key gone since it was ticked is let go
 *
 * @param table - every key, the rows on screen, and the keys the filter shows; `onChoose`, what the surface
 * does as a selection begins or changes
 *
 * @returns the `selection`, `onSelect` for a row, `onSelectAll` for every row on screen, `choose` for any
 * other change, `doomed` — what a delete would remove, and how many of those the view hides — and the
 * chosen keys' setter, for a surface that carries them through a change of its own
 */
export const useSelection = ({
	keys,
	rows,
	visible,
	onChoose
}: {
	keys: readonly KeyRow[]
	rows: readonly TableRow[]
	visible: readonly KeyRow[]
	onChoose: () => void
}) => {
	const [chosenKeys, setChosenKeys] = useState<Selection>(new Set())
	const selection = useMemo(() => keepExisting(chosenKeys, keys), [chosenKeys, keys])
	const selecting = useRef({ keys, rows, onChoose })
	selecting.current = { keys, rows, onChoose }
	const choose = useCallback((change: (current: Selection) => Selection) => {
		selecting.current.onChoose()
		setChosenKeys(current => change(keepExisting(current, selecting.current.keys)))
	}, [])
	const onSelect = useCallback((row: TableRow) => choose(current => toggleSelection(current, row)), [choose])
	const onSelectAll = useCallback(() => choose(current => toggleAll(current, selecting.current.rows)), [choose])
	const doomed = useMemo(() => bulkDelete(selection, keys, visible), [selection, keys, visible])
	return { selection, choose, onSelect, onSelectAll, doomed, setChosenKeys }
}
