import { studioLanguage, studioText } from '@linguify/constants'

/**
 * numbers as the studio's language writes them
 */
export const numbers = new Intl.NumberFormat(studioLanguage)

/**
 * counts in the studio's language — one key, two keys
 */
const plural = new Intl.PluralRules(studioLanguage)

/**
 * puts values into a phrase from constants
 *
 * @param phrase - a phrase naming its values in braces — `{count} extra`
 * @param values - each value by name
 *
 * @returns the phrase with its values in; a name with no value is left as it is
 */
export const fill = (phrase: string, values: Readonly<Record<string, string>>): string =>
	phrase.replace(/\{(\w+)\}/g, (name, key: string) => values[key] ?? name)

/**
 * @param count - how many keys
 *
 * @returns the word for that many keys
 */
export const keysWord = (count: number): string => studioText.keyCount[plural.select(count) === 'one' ? 'one' : 'other']

/**
 * @param count - how many keys
 *
 * @returns that many keys, in words — `1 key`, `2,000 keys`
 */
export const countKeys = (count: number): string =>
	fill(studioText.keyTotal, { count: numbers.format(count), keys: keysWord(count) })
