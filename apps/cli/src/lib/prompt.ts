import { cliFlags, errorCodes } from '@linguify/constants'
import { ValidationError } from '@linguify/core'
import { type CANCEL_SYMBOL, cancel, confirm, isCancel } from '@clack/prompts'
import type { Command } from 'commander'
import { longFlag, readGlobalOptions } from './options'

/**
 * thrown when a person cancels a question (Ctrl+C); the prompt has said so already, so it is reported by
 * the exit code alone
 */
export class Cancelled extends Error {
	override name = 'Cancelled'
}

/**
 * whether the command may ask a person anything: a terminal on both ends, and no `--json`
 *
 * @note a script, a pipe or CI has no one to answer; it must pass `--yes` instead
 *
 * @param command - the running command
 *
 * @returns whether to ask
 */
export const canAsk = (command: Command): boolean =>
	Boolean(process.stdin.isTTY && process.stdout.isTTY) && readGlobalOptions(command).json !== true

/**
 * @param value - a prompt's answer
 *
 * @returns it, unless the person cancelled
 *
 * @throws {@link Cancelled} when they did — after saying that nothing was written
 */
export const answered = <T>(value: T | typeof CANCEL_SYMBOL): T => {
	if (!isCancel(value)) return value
	cancel('Cancelled — nothing was written')
	throw new Cancelled()
}

/**
 * refuses a change that needs confirming when there is no one to confirm it
 *
 * @param command - the running command
 * @param refusal - why the change needs confirming — `key remove deletes keys from every locale`
 *
 * @throws {@link ValidationError} `CONFIRMATION_REQUIRED` when there is no one to ask: a script, a pipe,
 * CI or `--json` must pass `--yes`
 */
export const requireSomeoneToConfirm = (command: Command, refusal: string): void => {
	if (canAsk(command)) return
	throw new ValidationError(
		`${refusal}, and there is no one here to confirm it. Pass ${longFlag(cliFlags.yes.flags)} to go ahead`,
		{ code: errorCodes.confirmationRequired }
	)
}

/**
 * asks a person to confirm a change; only call it once {@link canAsk} holds
 *
 * @param question - what to confirm — `Remove 3 keys from every locale?`
 *
 * @throws {@link Cancelled} when the person says no or cancels — nothing is written
 */
export const confirmChange = async (question: string): Promise<void> => {
	if (answered(await confirm({ message: question, initialValue: false }))) return
	cancel('Nothing was written')
	throw new Cancelled()
}
