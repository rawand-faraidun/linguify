#!/usr/bin/env node
import { appDescription, appName } from '@linguify/constants'
import { Command } from 'commander'
import packageJson from '../package.json' with { type: 'json' }

/**
 * the root command; every subcommand registers onto it
 */
const program = new Command(appName)
	.description(appDescription)
	.version(packageJson.version, '-v, --version', 'print the version')
	.helpOption('-h, --help', 'print this help')
	.showHelpAfterError()

await program.parseAsync()
