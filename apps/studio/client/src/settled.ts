import { useEffect, useState } from 'react'

/**
 * a value once it has stopped changing for a while — so what is said aloud waits for typing to pause
 *
 * @param value - the value now
 * @param after - how long it must hold, in milliseconds
 *
 * @returns the value it last held that long
 */
export const useSettled = (value: string, after: number): string => {
	const [settled, setSettled] = useState(value)
	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), after)
		return () => clearTimeout(timer)
	}, [value, after])
	return settled
}
