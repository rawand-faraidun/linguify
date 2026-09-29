/**
 * a locale code as listed in the config — `en`, `ar`, `ckb`
 */
export type Locale = string

/**
 * a full dotted key path — `common.buttons.save`; with namespaces on, its first segment is the
 * namespace
 */
export type KeyPath = string

/**
 * a namespace name — the first segment of every key path while namespaces are on
 */
export type NamespaceName = string
