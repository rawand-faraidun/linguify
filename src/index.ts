#!/usr/bin/env node
import { program } from 'commander'
import init from './init'
import start from './start'
import sync from './sync'
import { defaultPort } from '@lib/defaults'

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

program.parse(process.argv)
