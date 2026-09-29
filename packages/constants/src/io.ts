/**
 * the file formats `export` writes and `import` reads
 */
export const ioFormats = {
	csv: 'csv',
	tsv: 'tsv',
	json: 'json',
	xlsx: 'xlsx'
} as const

/**
 * the format used when neither the config nor a flag chooses one
 */
export const defaultIoFormat = ioFormats.csv

/**
 * the default export / import file name, without its extension, in the working directory
 *
 * @note the same default for both commands, so `export` followed by `import` round-trips with no flags
 */
export const ioFileBaseName = 'translations'

/**
 * the cell separator of each delimited format
 */
export const ioDelimiters = {
	csv: ',',
	tsv: '\t'
} as const

/**
 * the header of every non-locale column; locale columns are headed by their locale code
 */
export const ioColumns = {
	key: 'key',
	description: 'description'
} as const
