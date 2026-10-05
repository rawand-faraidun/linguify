import type { Catalogue, LoadedConfig, Locale, Revision, TranslationTree } from '@linguify/types'
import { computeRevision, type EngineContext, type FileContent, type FileSnapshot, getEngine } from '../engine'
import { readDescriptions, serializeDescriptions } from './descriptions'

/**
 * a project's catalogue as read, with the revision a later write must still match
 */
export type CatalogueReading = {
	catalogue: Catalogue

	/**
	 * one hash over every file read — the translations and, when on, the descriptions
	 */
	revision: Revision

	/**
	 * every file read, present or not — what a write plan is compared against
	 */
	files: FileSnapshot[]
}

/**
 * reads every configured locale through the config's engine, and the descriptions when they are on
 *
 * @param loaded - the loaded config
 *
 * @returns the catalogue, the files it came from, and their revision
 */
export const readCatalogue = async (loaded: LoadedConfig): Promise<CatalogueReading> => {
	const { locales, files } = await getEngine(loaded.config.engine).read(engineContext(loaded))
	const { descriptions, snapshot } = await readDescriptions(loaded)
	const all = snapshot === undefined ? files : [...files, snapshot]
	return { catalogue: { locales, descriptions }, revision: computeRevision(all), files: all }
}

/**
 * turns a catalogue into the files that hold it, without touching the disk
 *
 * @param loaded - the loaded config
 * @param catalogue - the catalogue
 *
 * @returns every file the catalogue occupies, with its complete content
 */
export const serializeCatalogue = (loaded: LoadedConfig, catalogue: Catalogue): FileContent[] => {
	const files = getEngine(loaded.config.engine).serialize(engineContext(loaded), catalogue.locales)
	const descriptions = serializeDescriptions(loaded, catalogue.descriptions)
	return descriptions === undefined ? files : [...files, descriptions]
}

/**
 * the files a fresh project starts with — an empty catalogue, serialised
 *
 * @note single-file gets an empty file per locale, multi-file none (a locale has files only once it has
 * namespaces), and the descriptions file an empty map when descriptions are on
 *
 * @param loaded - the loaded config
 *
 * @returns the files `init` writes
 */
export const scaffoldCatalogue = (loaded: LoadedConfig): FileContent[] =>
	serializeCatalogue(loaded, {
		locales: Object.fromEntries(loaded.config.locales.map((locale): [Locale, TranslationTree] => [locale, {}])),
		descriptions: {}
	})

/**
 * @param loaded - the loaded config
 *
 * @returns what the config's engine is told about the project
 */
const engineContext = ({ config, localesDirectory }: LoadedConfig): EngineContext => ({
	directory: localesDirectory,
	locales: config.locales,
	options: config.options
})
