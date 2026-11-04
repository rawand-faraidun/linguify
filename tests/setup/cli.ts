import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

/**
 * the CLI as npm installs it: the built bundle, run by Node — never its source, so commander's own handling
 * of every flag is what is tested
 */
export const binary = join(import.meta.dirname, '../../apps/cli/dist/index.js')

/**
 * runs the built CLI in a folder, piped — no terminal on either end, as a script runs it
 *
 * @param args - the arguments, as a shell would split them
 * @param cwd - the folder it runs in
 *
 * @returns what it printed on each stream, and its exit code
 */
export const runCli = (args: readonly string[], cwd: string) => {
	if (!existsSync(binary))
		throw new Error(`${binary} is not built: run the tests with \`pnpm test\`, which builds it first`)
	return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
		const child = spawn(process.execPath, [binary, ...args], {
			cwd,
			env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: undefined },
			stdio: ['ignore', 'pipe', 'pipe']
		})
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', chunk => (stdout += chunk))
		child.stderr.on('data', chunk => (stderr += chunk))
		child.on('error', reject)
		child.on('close', code => resolve({ stdout, stderr, code }))
	})
}

/**
 * runs the built CLI with `--json` added
 *
 * @returns its one JSON answer, its stderr — which `--json` leaves empty — and its exit code
 */
export const runCliJson = async <Data = unknown>(args: readonly string[], cwd: string) => {
	const { stdout, stderr, code } = await runCli([...args, '--json'], cwd)
	return { answer: JSON.parse(stdout) as JsonAnswer<Data>, stderr, code }
}

/**
 * what the CLI prints under `--json`: its data, or the error
 */
export type JsonAnswer<Data> = {
	ok: boolean
	data?: Data
	error?: { code: string; message: string; details?: Record<string, unknown> }
}

/**
 * starts the built CLI's studio and reads its one JSON answer, then stops it
 *
 * @param args - the arguments after `studio`, `--json` and `--no-open` added
 * @param cwd - the folder it runs in
 *
 * @returns its answer
 */
export const startCliStudio = (args: readonly string[], cwd: string) =>
	new Promise<{ ok: boolean; data?: { url: string }; error?: { code: string; message: string } }>((resolve, reject) => {
		const child = spawn(process.execPath, [binary, 'studio', ...args, '--no-open', '--json'], {
			cwd,
			env: { ...process.env, NO_COLOR: '1' },
			stdio: ['ignore', 'pipe', 'pipe']
		})
		let stdout = ''
		child.stdout.on('data', chunk => {
			stdout += chunk
			try {
				resolve(JSON.parse(stdout))
				child.kill()
			} catch {
				// not whole yet
			}
		})
		child.on('error', reject)
		child.on('close', () => reject(new Error(`the studio stopped without answering: ${stdout}`)))
	})

/**
 * @returns a port nothing listens on now
 */
export const freePort = () =>
	new Promise<number>(resolve => {
		const server = createServer()
		server.listen(0, '127.0.0.1', () => {
			const address = server.address()
			server.close(() => resolve(typeof address === 'object' && address !== null ? address.port : 0))
		})
	})
