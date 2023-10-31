/**
 * dynamic object
 */
export type DynamicObject = {
  [x: string]: DynamicObject | string
}

/**
 * flat object
 */
export type FlatObject = Record<string, string>
