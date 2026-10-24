import { resolve } from 'node:path'
import { cliFlags, cliInputFlags, cliTranslationSeparator, errorCodes } from '@linguify/constants'
import { ValidationError } from '@linguify/core'
import { type Command, InvalidArgumentError } from 'commander'

/**
 * the flags every command takes
 */
export type GlobalOptions = {
	config?: string
	cwd?: string
	json?: boolean
}

/**
 * adds the flags every command takes, read wherever they appear — `linguify --json config` and
 * `linguify config --json` are the same
 *
 * @param program - the root command
 *
 * @returns the root command
 */
export const addGlobalOptions = (program: Command): Command =>
	program
		.option(cliFlags.config.flags, cliFlags.config.description)
		.option(cliFlags.cwd.flags, cliFlags.cwd.description)
		.option(cliFlags.json.flags, cliFlags.json.description)

/**
 * @param command - the running command
 *
 * @returns the global flags as given
 */
export const readGlobalOptions = (command: Command): GlobalOptions => command.optsWithGlobals<GlobalOptions>()

/**
 * @param command - the running command
 *
 * @returns the folder the command works in, absolute: `--cwd` when given, else where it was started
 */
export const projectFolder = (command: Command): string => resolve(readGlobalOptions(command).cwd ?? process.cwd())

/**
 * @param flags - a flag's definition — `-y, --yes`
 *
 * @returns its long form, as a message names it — `--yes`
 */
export const longFlag = (flags: string): string => flags.split(' ').find(part => part.startsWith('--')) ?? flags

/**
 * reads one `-t locale=text` and adds it to those already given — commander calls it once per `-t`
 *
 * @note split at the first `=`, so the text may hold `=` itself
 *
 * @param given - one `-t` as typed
 * @param previous - the ones before it
 *
 * @returns every `-t` so far, as locale and text
 *
 * @throws {@link InvalidArgumentError} when there is no `=`, or nothing before it
 */
export const collectTranslation = (given: string, previous: [string, string][] = []): [string, string][] => {
	const at = given.indexOf(cliTranslationSeparator)
	if (at < 1) {
		throw new InvalidArgumentError(
			`Write it as locale${cliTranslationSeparator}text — \`ckb${cliTranslationSeparator}پاشەکەوتکردن\``
		)
	}
	return [...previous, [given.slice(0, at), given.slice(at + 1)]]
}

/**
 * @param pairs - every `-t` given, as locale and text
 *
 * @returns them as the input's `translations`, or nothing when none were given
 *
 * @throws {@link ValidationError} `INVALID_INPUT` when a locale is given twice — which of the two was
 * meant cannot be guessed
 */
export const translationsFrom = (pairs: [string, string][] | undefined): Record<string, string> | undefined => {
	if (pairs === undefined) return undefined
	const repeated = pairs.find(([locale], index) => pairs.findIndex(([other]) => other === locale) !== index)
	if (repeated !== undefined) {
		throw new ValidationError(`\`${repeated[0]}\` is given twice with ${longFlag(cliInputFlags.translation)}`, {
			code: errorCodes.invalidInput,
			details: { locale: repeated[0] }
		})
	}
	return Object.fromEntries(pairs)
}

/**
 * @param field - an input field's contract
 *
 * @returns its description — the help of the flag or argument that fills it, so the two never drift
 */
export const helpFor = (field: { description?: string | undefined }): string => field.description ?? ''
