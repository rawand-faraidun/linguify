/**
 * dynamic object
 */
export type DynamicObject = Record<string, any>

/**
 * default linguify config
 */
export type Config = {
  /**
   * locales directory path
   *
   * @default './public/locales'
   */
  localesPath: string

  /**
   * provided locales codes
   *
   * better to use {@link https://www.iso.org/iso-639-language-codes.html ISO-639}
   *
   * @default ['en']
   */
  locales: string[]

  /**
   * default locale code
   *
   * used as the main locale for the project, namespaces and traslation
   *
   * @default 'en'
   */
  defaultLocale: string

  /**
   * determines to use single file translations or not
   *
   * instead of having a file for each namespace, it allows to have one file for each locale
   *
   * @default false
   */
  useSingleFile: boolean
  /**
   * determines indentation of output translations files
   * 
   * This is used when outputting translations files at `JSON.stringify(translation, null, jsonIndentation)`
   * 
   * @default 2
   */
  jsonIndentation: number
}
