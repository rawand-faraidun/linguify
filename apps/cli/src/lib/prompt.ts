import type { Command } from 'commander'
import { readGlobalOptions } from './options'

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
