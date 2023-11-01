import _ from 'lodash'
import type { DynamicObject } from './types'

/**
 * option props
 */
interface Options {
  separator?: string
}

/**
 * flatten object into single-depth object
 *
 * @param object - source object
 * @param options - options
 *
 * @returns flattened object
 */
export const flatten = (object: DynamicObject, { separator = '.' }: Options = {}) => {
  const flattened: DynamicObject = {}

  for (const key in object) {
    if (!object.hasOwnProperty(key)) continue

    if (object[key] !== null && typeof object[key] == 'object') {
      // flattening child objects recursively
      let flatObject = flatten(object[key], { separator })
      for (let x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue
        flattened[key + separator + x] = flatObject[x]
      }
    } else {
      flattened[key] = object[key]
    }
  }
  return flattened
}

/**
 * Convert a flattened object into a nested object.
 *
 * @param object - source object
 * @param options - options
 *
 * @returns nested object
 */
export const unflatten = (flatObject: DynamicObject, { separator = '.' }: Options = {}) => {
  const nested: DynamicObject = {}

  for (const key in flatObject) {
    if (!flatObject.hasOwnProperty(key)) continue

    const keyParts = key.split(separator)
    let currentNode = nested

    for (let i = 0; i < keyParts.length; i++) {
      const keyPart = keyParts[i]

      if (keyPart !== undefined && keyPart !== '') {
        if (i === keyParts.length - 1) {
          // If it's the last part of the key, assign the value
          currentNode[keyPart] = flatObject[key]
        } else {
          // Create an empty object if it doesn't exist, or use the existing one
          currentNode = currentNode[keyPart] = currentNode[keyPart] || {}
        }
      }
    }
  }

  return nested
}

/**
 * clears object from empty nested objects
 *
 * @param object - object to clear
 *
 * @returns clear object
 */
export const clear = (object: DynamicObject): DynamicObject => {
  return _(object).pickBy(_.isObject).mapValues(clear).omitBy(_.isEmpty).assign(_.omitBy(object, _.isObject)).value()
}
