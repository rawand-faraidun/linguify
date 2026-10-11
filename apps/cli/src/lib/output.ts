import { toApiError } from '@linguify/api'
import { cliErrorHint, cliNoCommandMessage, errorCodes, exitCodes } from '@linguify/constants'
import { type LinguifyError, ValidationError } from '@linguify/core'
import type { Command } from 'commander'
import { CommanderError } from 'commander'
import { readGlobalOptions } from './options'
import { renderError } from './render/error'
import { renderJson } from './render/json'

/**
 * commander's code for "no command was given", after which it has shown the help
 */
const noCommand = 'commander.help'

/**
 * runs a command's work and prints the outcome — for a person, or as one JSON object under `--json`
 *
 * @note an error is printed, never thrown: it sets a failing `process.exitCode`, so the process ends on
 * its own once everything is written. Under `--json` the error goes to stdout like a result, so a
 * script reads exactly one object either way
 *
 * @param command - the running command
 * @param work - what the command does
 * @param render - how a person sees the result
 */
export const respond = async <T>(command: Command, work: () => Promise<T>, render: (result: T) => string) => {
	const { json = false } = readGlobalOptions(command)
	try {
		const result = await work()
		process.stdout.write(json ? renderJson({ ok: true, data: result }) : render(result))
	} catch (error) {
		fail(toApiError(error), json)
	}
}

/**
 * reports a command-line mistake commander caught — a mistyped command or flag — the same way as any
 * other error; `--help` and `--version` end successfully, and with no command a person has already been
 * shown the help
 *
 * @param error - what parsing threw
 * @param json - whether `--json` was asked for
 */
export const respondToParseError = (error: unknown, json: boolean) => {
	if (!(error instanceof CommanderError)) return fail(toApiError(error), json)
	if (error.exitCode === exitCodes.success) return
	if (error.code === noCommand) {
		if (json) fail(new ValidationError(cliNoCommandMessage, { code: errorCodes.invalidInput }), json)
		else process.exitCode = exitCodes.failure
		return
	}
	const message = error.message.replace(/^error: /, '')
	fail(
		new ValidationError(message, { code: errorCodes.invalidInput, details: { reason: error.code } }),
		json,
		cliErrorHint
	)
}

/**
 * @param error - what went wrong
 * @param json - whether `--json` was asked for
 * @param hint - a line for a person on what to do next, left out of `--json`
 */
const fail = (error: LinguifyError, json: boolean, hint?: string) => {
	process.exitCode = exitCodes.failure
	if (json) process.stdout.write(renderJson({ ok: false, error: error.toJSON() }))
	else process.stderr.write(renderError(error.toJSON(), hint))
}
