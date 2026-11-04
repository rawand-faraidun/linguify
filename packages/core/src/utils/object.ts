/**
 * whether a value is a plain object — what `JSON.parse` produces for `{…}`
 *
 * @param value - value to check
 *
 * @returns `true` for a plain object, `false` for arrays, `null`, class instances and primitives
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * reads a property only when the object holds it itself
 *
 * @note `{}.toString` is a function inherited from `Object.prototype`, so a key named `toString` would
 * otherwise find a value in every object
 *
 * @param record - object to read
 * @param key - property name
 *
 * @returns the property's value, or `undefined` when the object does not hold it
 */
export const getOwn = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
	Object.hasOwn(record, key) ? record[key] : undefined

/**
 * merges two plain objects; the second wins
 *
 * @note nested plain objects merge, everything else — arrays included — is replaced whole; an
 * `undefined` value means "not set" and never replaces anything. Only own keys are read, and the
 * result is built with `Object.fromEntries`, so a `__proto__` key stays an ordinary key
 *
 * @param base - the weaker object
 * @param override - the stronger object
 *
 * @returns a new object; neither input is changed
 */
export const mergeDeep = (base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(
		[...new Set([...Object.keys(base), ...Object.keys(override)])].flatMap((key): [string, unknown][] => {
			const weak = getOwn(base, key)
			const strong = getOwn(override, key)
			if (strong === undefined) return weak === undefined ? [] : [[key, weak]]
			if (isPlainObject(weak) && isPlainObject(strong)) return [[key, mergeDeep(weak, strong)]]
			return [[key, strong]]
		})
	)

/**
 * lists the path of every leaf in a plain object
 *
 * @note arrays are leaves; an empty object holds nothing, so it has no leaves
 *
 * @param value - object to walk
 *
 * @returns each leaf's path as its segments
 */
export const collectLeafPaths = (value: Record<string, unknown>): string[][] =>
	Object.entries(value).flatMap(([key, child]) =>
		isPlainObject(child) ? collectLeafPaths(child).map(path => [key, ...path]) : [[key]]
	)
