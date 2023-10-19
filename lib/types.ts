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
   * to use google translate, please use {@link https://cloud.google.com/translate/docs/languages Google translate language codes}
   *
   * @default ['en']
   */
  locales: string[]

  /**
   * default locale code
   *
   * used as the main locale for the project and traslation, also used as the source text for google translate
   *
   * @default 'en'
   */
  defaultLocale: string

  /**
   * determines to use Google translate or not
   *
   * this project uses a free to use library and may have issues and delays with translations.
   * if any translation failed consider refreshing it
   * @see {@link https://github.com/cjvnjde/google-translate-api-browser}
   *
   * @default false
   */
  useGoogleTranslate: boolean
}
