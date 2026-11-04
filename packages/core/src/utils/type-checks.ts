/**
 * `true` when two types are exactly the same — not merely assignable to each other
 *
 * @note distinguishes `{ a?: string }` from `{ a?: string | undefined }` and `readonly` from mutable,
 * which an assignability check in either direction misses
 */
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

/**
 * a compile-time assertion: compiles only when `T` is `true`
 *
 * @example
 * export type SchemaMatches = Expect<Equal<z.output<typeof schema>, Config>>
 */
export type Expect<T extends true> = T
