import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cliFlags, studioAssetsDir, studioText } from '@linguify/constants'
import { startStudio } from '@linguify/studio-server'
import type { ConfigInput } from '@linguify/types'
import { Command, InvalidArgumentError } from 'commander'
import open from 'open'
import { callerFor } from '../lib/caller'
import { projectFolder, readGlobalOptions } from '../lib/options'
import { respond } from '../lib/output'
import { atTerminal, dim } from '../lib/render/text'

/**
 * the built studio client, beside the bundle — absent when running from source, where the studio
 * shows a placeholder page
 */
const assets = join(dirname(fileURLToPath(import.meta.url)), studioAssetsDir)

/**
 * `linguify studio`
 *
 * @note `--port` and `--open` mirror `studio.port` and `studio.open`, so they reach the config's flag
 * layer only when typed — a flag never overrides the config with a default. The command keeps running
 * until Ctrl+C, which closes the server and lets the process end on its own
 */
export const studioCommand = new Command('studio')
	.description('Start the studio — the translation table in a browser — on this machine only')
	.option(cliFlags.port.flags, cliFlags.port.description, parsePort)
	.option(cliFlags.open.flags, cliFlags.open.description)
	.option(cliFlags.noOpen.flags, cliFlags.noOpen.description)
	.action((options: { port?: number; open?: boolean }, command: Command) =>
		respond(
			command,
			async () => {
				const typed = (name: 'port' | 'open') => command.getOptionValueSource(name) === 'cli'
				const flag: ConfigInput = {
					studio: {
						...(typed('port') && options.port !== undefined ? { port: options.port } : {}),
						...(typed('open') && options.open !== undefined ? { open: options.open } : {})
					}
				}
				const { config } = await callerFor(command, flag).config.get()
				const studio = await startStudio({
					cwd: projectFolder(command),
					config: readGlobalOptions(command).config,
					port: config.studio.port,
					assets: existsSync(assets) ? assets : undefined
				})
				process.once('SIGINT', () => {
					void studio.close()
				})
				if (config.studio.open && readGlobalOptions(command).json !== true)
					await open(studio.url).catch(() => undefined)
				return { url: studio.url }
			},
			({ url }) => `${studioText.title} is running at ${url}\n${atTerminal() ? `${dim('Press Ctrl+C to stop')}\n` : ''}`
		)
	)

/**
 * @param value - `--port` as typed
 *
 * @returns it as a port number
 *
 * @throws {@link InvalidArgumentError} for anything but a whole number — the config's own range check
 * then reports one out of range
 */
function parsePort(value: string): number {
	if (!/^\d+$/.test(value)) throw new InvalidArgumentError('Give the port as a number — 5678')
	return Number(value)
}
