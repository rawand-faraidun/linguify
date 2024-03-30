#!/usr/bin/env node
import { program } from 'commander'
import init from './init'
import start from './start'
import sync from './sync'
import { exportTranslations } from './translations'
import { defaultPort, xlsxFileName } from '@lib/defaults'
import { getPath } from '@lib/functions'

export { type Config } from '@lib/types'

/**
 * starting linguify
 */
program
  .command('start', { isDefault: true })
  .description('start linguify')
  .option('-p, --port <port>', 'port', `${defaultPort}`)
  .action(options => start(options.port || defaultPort))

/**
 * initiate linguify
 */
program.command('init').description('initiate linguify').action(init)

/**
 * sync linguify
 */
program.command('sync').description('sync linguify translations').action(sync)

/**
 * export translations to xlsx
 */
program
  .command('export')
  .option('-p, --path <path>', 'path', getPath(xlsxFileName))
  .description('export translations to xlsx')
  .action(options => exportTranslations(options.path || getPath(xlsxFileName)))

program.parse(process.argv)
