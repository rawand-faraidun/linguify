/**
 * separates the segments of a key path — `common.buttons.save`
 *
 * @note a segment can therefore never contain this character; the JSON files may, but linguify
 * cannot address such a key
 */
export const keySeparator = '.'

/**
 * the value a locale gets for a key it has no translation for
 *
 * @note empty rather than absent, so the key exists in every locale and `diff` reports it as empty
 * instead of missing
 */
export const emptyTranslation = ''
