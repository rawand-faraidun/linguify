import { DynamicObject, FlatObject } from '@lib/types/object'

/**
 * namespace ns
 */
export type NS = string

/**
 * namespace
 *
 * namespace with it's values
 */
export interface Namespace {
  namespace: NS
  values: Record<string, DynamicObject>
  flatten: Record<string, FlatObject>
  flattenValues: {
    key: string
    value: string
    translations: FlatObject
  }[]
}

/**
 * add namespace
 */
export interface AddNamespace {
  namespace: NS
}

/**
 * edit namespace
 */
export interface EditNamespace {
  namespace: NS
}
