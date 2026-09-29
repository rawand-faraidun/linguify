/**
 * every error code linguify raises
 *
 * @note codes are the contract between core and every surface: the cli, the studio and the extension
 * branch on a code, never on message text, so a message can be reworded without breaking anything.
 * They live here, not beside the error classes in core, because browser code needs them too
 */
export const errorCodes = {
	/**
	 * no `linguify.config.json` was found from the working directory upwards
	 */
	configNotFound: 'CONFIG_NOT_FOUND',

	/**
	 * the config file is not valid JSON, or fails the schema
	 */
	configInvalid: 'CONFIG_INVALID',

	/**
	 * `init` found a config already, and never overwrites one
	 */
	configExists: 'CONFIG_EXISTS',

	/**
	 * the config names an engine that is not registered
	 */
	engineUnknown: 'ENGINE_UNKNOWN',

	/**
	 * a translation file is not valid JSON
	 */
	fileInvalid: 'FILE_INVALID',

	/**
	 * a translation file is valid JSON but not a shape the engine can read — for example a top-level
	 * string where namespaces are expected
	 */
	invalidStructure: 'INVALID_STRUCTURE',

	/**
	 * the files changed on disk after they were read, so writing would overwrite someone's edit
	 */
	staleCatalogue: 'STALE_CATALOGUE',

	/**
	 * an input failed validation
	 */
	invalidInput: 'INVALID_INPUT',

	/**
	 * a locale that is not listed in the config
	 */
	localeUnknown: 'LOCALE_UNKNOWN',

	/**
	 * a namespace command while namespaces are turned off
	 */
	namespacesDisabled: 'NAMESPACES_DISABLED',

	/**
	 * the named namespace does not exist
	 */
	namespaceNotFound: 'NAMESPACE_NOT_FOUND',

	/**
	 * a namespace with that name already exists
	 */
	namespaceExists: 'NAMESPACE_EXISTS',

	/**
	 * the named key does not exist
	 */
	keyNotFound: 'KEY_NOT_FOUND',

	/**
	 * a key already exists at the target path
	 */
	keyExists: 'KEY_EXISTS',

	/**
	 * the path runs through an existing translation, so it cannot hold a nested key
	 */
	keyNotAssignable: 'KEY_NOT_ASSIGNABLE',

	/**
	 * a description was passed while descriptions are turned off
	 */
	descriptionsDisabled: 'DESCRIPTIONS_DISABLED',

	/**
	 * an import file's content cannot be read in the chosen format
	 */
	importInvalid: 'IMPORT_INVALID',

	/**
	 * the action needs a confirmation, but there is no terminal to ask and `--yes` was not passed
	 */
	confirmationRequired: 'CONFIRMATION_REQUIRED',

	/**
	 * the studio's port is already taken
	 */
	portInUse: 'PORT_IN_USE'
} as const
