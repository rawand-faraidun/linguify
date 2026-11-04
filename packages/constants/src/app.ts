/**
 * the published cli package, and the command users type
 */
export const appName = 'linguify'

/**
 * one-line summary shown by `--help`
 */
export const appDescription = 'Developer-first translation file manager.'

/**
 * the project's repository
 */
export const repository = 'https://github.com/rawand-faraidun/linguify'

/**
 * the editor extension's package name, on both marketplaces
 */
export const extensionName = 'linguify-vs'

/**
 * the editor extension's name as shown in the marketplaces and the editor
 */
export const extensionDisplayName = 'Linguify'

/**
 * the publisher id the extension is released under, on both marketplaces
 */
export const extensionPublisher = 'rawand-faraidun'

/**
 * where each published artefact can be found
 *
 * @note the VS Code Marketplace and OpenVSX are separate registries — a release reaches one only
 * when it is published to that one
 */
export const registryUrls = {
	npm: `https://www.npmjs.com/package/${appName}`,
	vscodeMarketplace: `https://marketplace.visualstudio.com/items?itemName=${extensionPublisher}.${extensionName}`,
	openVsx: `https://open-vsx.org/extension/${extensionPublisher}/${extensionName}`
} as const
