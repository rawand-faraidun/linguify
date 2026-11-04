/**
 * the union of an object's values — turns an `as const` object into the type of its members
 *
 * @example
 * type ViewMode = Values<typeof viewModes> // 'flat' | 'tree' | 'compact'
 */
export type Values<T> = T[keyof T]

/**
 * every field optional and allowed to be `undefined`
 *
 * @note not `Partial<T>`: under `exactOptionalPropertyTypes` that forbids an explicit `undefined`,
 * while zod's inferred input allows it, so only this shape equals a zod schema's input exactly
 */
export type Optional<T> = { [K in keyof T]?: T[K] | undefined }
