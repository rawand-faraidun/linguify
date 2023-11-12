import { FlatObject } from '@lib/types/object'

/**
 * key props
 */
export interface Key {
  key: string
  value: string
  translations: FlatObject
}

/**
 * key edit props
 */
export interface EditKey extends Key {
  oldKey: Key['key']
}
