#!/usr/bin/env node
import { program } from 'commander'
import { init } from './init'

export { type Configs } from '@lib/types'

/**
 * starting linguify
 */
program
  .command('start', { isDefault: true })
  .description('start linguify')
  .action(props => {
    console.log('start')
  })

/**
 * initiate linguify
 */
program
  .command('init')
  .description('initiate linguify')
  .action(props => init())

program.parse(process.argv)
