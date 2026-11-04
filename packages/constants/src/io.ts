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
 * the line ending of each delimited format — `\r\n`, as RFC 4180 defines CSV
 */
export const ioLineEnding = '\r\n'

/**
 * the cell separator of each delimited format
 */
export const ioDelimiters = {
	csv: ',',
	tsv: '\t'
} as const

/**
 * the separator Excel uses for csv in regions where the comma is the decimal separator — German,
 * French and many more
 *
 * @note `import` accepts it when the header line uses it: header cells are `key`, `description` and
 * locale codes, none of which can contain `,` or `;`, so the header tells the two apart without guessing
 */
export const regionalCsvDelimiter = ';'

/**
 * the most characters an Excel cell can hold; a longer one is cut or refused when the file is opened
 */
export const xlsxMaxCellLength = 32_767

/**
 * how wide an exported spreadsheet's columns are, in characters
 */
export const xlsxColumnWidths = {
	key: 40,
	text: 30
} as const

/**
 * the header of every non-locale column; locale columns are headed by their locale code
 *
 * @note so a locale code can never be one of these — the config refuses it
 */
export const ioColumns = {
	key: 'key',
	description: 'description'
} as const

/**
 * the file each table format is written to and read from when none is named — `translations.csv`
 */
export const ioDefaultPaths = {
	[ioFormats.csv]: `${ioFileBaseName}.${ioFormats.csv}`,
	[ioFormats.tsv]: `${ioFileBaseName}.${ioFormats.tsv}`,
	[ioFormats.json]: `${ioFileBaseName}.${ioFormats.json}`,
	[ioFormats.xlsx]: `${ioFileBaseName}.${ioFormats.xlsx}`
} as const
