import { execFileSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'

// the .vsix, from the built extension: the manifest written afresh from the config's schema, the icon taken
// from the repo's shared assets — the marketplace takes only files inside the extension — then vsce, which
// leaves dependencies out: everything is bundled, and its walk of them does not understand pnpm workspaces
const extension = join(import.meta.dirname, '..')
execFileSync('pnpm', ['manifest'], { cwd: extension, stdio: 'inherit' })
copyFileSync(join(extension, '../../assets/logo.png'), join(extension, 'icon.png'))
execFileSync('pnpm', ['exec', 'vsce', 'package', '--no-dependencies', ...process.argv.slice(2)], {
	cwd: extension,
	stdio: 'inherit'
})
