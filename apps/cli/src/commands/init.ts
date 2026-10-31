import { styleText } from 'node:util'
import { locale } from '@linguify/api'
import {
	appName,
	cliFlags,
	configDefaults,
	defaultEngineId,
	errorCodes,
	exampleKey,
	exampleKeyPath,
	fileStructures
} from '@linguify/constants'
import { getEngine, type InitInput, type InitResult, ValidationError } from '@linguify/core'
import { confirm, intro, select, text } from '@clack/prompts'
import { Command } from 'commander'
import { callerFor } from '../lib/caller'
import { longFlag, projectFolder } from '../lib/options'
import { respond } from '../lib/output'
import { answered, type Cancelled, canAsk } from '../lib/prompt'
import { shownPath } from '../lib/render/text'

/**
 * `linguify init`
 */
export const initCommand = new Command('init')
	.description('Start a project here: write linguify.config.json and create the locale files')
	.option(cliFlags.yes.flags, cliFlags.yes.description)
	.action((options: { yes?: boolean }, command: Command) =>
		respond(
			command,
			async () => callerFor(command).init(options.yes === true ? {} : await ask(command)),
			result => renderInit(result, projectFolder(command))
		)
	)

/**
 * asks a person how to set the project up
 *
 * @param command - the running command
 *
 * @returns the answers
 *
 * @note a locale typed twice is refused at the prompt, though the config would refuse it too: asked
 * there, the person fixes that one answer instead of starting over after the last question
 *
 * @throws {@link ValidationError} `CONFIRMATION_REQUIRED` when there is no one to ask — a script, a pipe,
 * CI or `--json` must pass `--yes`
 * @throws {@link Cancelled} when the person cancels
 */
const ask = async (command: Command): Promise<InitInput> => {
	if (!canAsk(command)) {
		throw new ValidationError(
			`init asks a few questions, and there is no one to ask here. Pass ${longFlag(cliFlags.yes.flags)} to take the defaults`,
			{ code: errorCodes.confirmationRequired }
		)
	}
	const engineDefaults = getEngine(defaultEngineId).options.parse({})
	intro(styleText('bold', `${appName} init`))
	const path = orDefault(
		answered(
			await text({
				message: 'Where should the translation files live?',
				placeholder: configDefaults.path,
				defaultValue: configDefaults.path
			})
		),
		configDefaults.path
	)
	const typed = splitLocales(
		answered(
			await text({
				message: 'Which locales? Separate them with commas',
				placeholder: configDefaults.locales.join(', '),
				defaultValue: configDefaults.locales.join(', '),
				validate: value => {
					const codes = splitLocales(value ?? '')
					if (codes.length === 0) return value?.trim() ? 'Name at least one locale — en, ckb' : undefined
					const problem = codes.map(code => locale.safeParse(code)).find(result => !result.success)
					if (problem !== undefined) return problem.error?.issues[0]?.message
					// once each, letter case aside — the config refuses `en` and `EN`, one file on a case-insensitive disk
					return new Set(codes.map(code => code.toLowerCase())).size === codes.length ? undefined : 'Each locale once'
				}
			})
		)
	)
	const locales = typed.length > 0 ? typed : [...configDefaults.locales]
	const defaultLocale =
		locales.length > 1
			? answered(
					await select({
						message: 'Which is the default — the one every other is compared against?',
						options: locales.map(value => ({ value, label: value }))
					})
				)
			: locales[0]
	const fileStructure = answered(
		await select({
			message: 'How should each locale be laid out?',
			initialValue: engineDefaults.fileStructure,
			options: [
				{ value: fileStructures.single, label: 'One file per locale', hint: 'en.json' },
				{ value: fileStructures.multi, label: 'A folder per locale, a file per namespace', hint: 'en/common.json' }
			]
		})
	)
	const namespaces =
		fileStructure === fileStructures.multi ||
		answered(
			await confirm({
				message: `Use namespaces? The first part of every key then names its group — ${exampleKeyPath}`,
				initialValue: engineDefaults.namespaces === true
			})
		)
	return { path, locales, default: defaultLocale, options: { fileStructure, namespaces } }
}

/**
 * @param value - a text answer
 * @param fallback - what a blank answer means
 *
 * @returns the answer trimmed, or the fallback when nothing but spaces was typed
 */
const orDefault = (value: string, fallback: string): string => value.trim() || fallback

/**
 * @param value - locales as typed — `en, ckb`
 *
 * @returns each code, trimmed, blanks dropped
 */
const splitLocales = (value: string): string[] =>
	value
		.split(',')
		.map(code => code.trim())
		.filter(code => code !== '')

/**
 * @param result - what `init` did
 * @param cwd - the working folder, which paths are shown from
 *
 * @returns each file created or kept, then the next step
 */
const renderInit = ({ file, created, kept, config }: InitResult, cwd: string): string => {
	const style = { stream: process.stdout }
	const example = config.options.namespaces === false ? exampleKey.name : exampleKeyPath
	return [
		`${styleText('green', 'created', style)}  ${shownPath(cwd, file)}`,
		...created.map(path => `${styleText('green', 'created', style)}  ${shownPath(cwd, path)}`),
		...kept.map(
			path =>
				`${styleText('dim', 'kept', style)}     ${shownPath(cwd, path)} ${styleText('dim', '(already there)', style)}`
		),
		'',
		`Next, add a key: ${appName} key add ${example} --value "${exampleKey.text}"`,
		''
	].join('\n')
}
