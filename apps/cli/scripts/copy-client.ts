import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { studioAssetsDir } from '@linguify/constants'

const client = join(import.meta.dirname, '../../studio/client/dist')
const target = join(import.meta.dirname, '../dist', studioAssetsDir)

if (!existsSync(join(client, 'index.html')))
	throw new Error('The studio client is not built — `pnpm build` at the repo root builds it before the cli')
rmSync(target, { recursive: true, force: true })
cpSync(client, target, { recursive: true })
