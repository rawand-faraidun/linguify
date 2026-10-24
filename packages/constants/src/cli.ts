/**
 * every flag the command line accepts, as commander reads it, with its help text
 *
 * @note flags that mirror an input field take their help from that field's contract instead; these are
 * the ones no contract describes
 */
export const cliFlags = {
	version: { flags: '-v, --version', description: 'Print the version' },
	help: { flags: '-h, --help', description: 'Print this help' },
	config: { flags: '-c, --config <file>', description: 'Use this config file instead of searching for one' },
	cwd: { flags: '--cwd <folder>', description: 'Run as if started in this folder' },
	yes: {
		flags: '-y, --yes',
		description: 'Take the defaults and confirm instead of asking — what a script or CI passes'
	},
	json: {
		flags: '--json',
		description: 'Print one JSON object — `{ ok, data }` or `{ ok, error }` — and never ask anything'
	},
	table: { flags: '-t, --table', description: 'Show the result as a table, one column per locale' }
} as const

/**
 * the flags that mirror an input field, as commander reads them; their help is that field's description
 * in its contract
 */
export const cliInputFlags = {
	locale: '-l, --locale <code>'
} as const

/**
 * what stands in a cell, dimmed, where a locale has no text to show
 */
export const cliTextMarkers = {
	/**
	 * the locale lacks the key
	 */
	missing: '(missing)',

	/**
	 * the locale has the key, with empty text
	 */
	empty: '(empty)',

	/**
	 * beside the default locale, in `list locales`
	 */
	default: '(default)'
} as const

/**
 * the narrowest a `--table` column's text is squeezed to when the table is wider than the terminal
 */
export const cliTableMinimumColumnWidth = 8

/**
 * the characters `--table` draws its lines with: each rule's left end, crossing and right end, the
 * horizontal line, and the vertical one between cells
 */
export const cliTableBorders = {
	top: ['┌', '┬', '┐'],
	underHead: ['├', '┼', '┤'],
	bottom: ['└', '┴', '┘'],
	horizontal: '─',
	vertical: '│'
} as const

/**
 * the command that prints a command's help — `linguify help config`, the same as `linguify config --help`
 */
export const cliHelpCommand = { name: 'help [command]', description: 'Print the help for a command' } as const

/**
 * what `--json` reports when no command was given — a person gets the help instead
 */
export const cliNoCommandMessage = 'No command given. Run with --help to see the commands'

/**
 * the one line added under an error from the command line itself — a mistyped command or flag
 */
export const cliErrorHint = 'Run with --help to see what this command accepts'

/**
 * what the process exits with
 *
 * @note `failure` for every error, and for `format --check` finding files to format — the one command
 * that gates; `diff` always succeeds
 */
export const exitCodes = {
	success: 0,
	failure: 1
} as const
