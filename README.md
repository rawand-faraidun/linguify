# <img src="https://github.com/rawand-faraidun/linguify/blob/main/assets/linguify.svg?raw=true" alt="linguify" width="18px"/> linguify

Linguify translation files manager

## Getting started

### Usage

1. Initiate Linguify with the `init` command

```bash
npx linguify init
```

 * This will create `linguify.config.json` file at the root of your project.

<br />

2. Modify the following values inside `linguify.config.json`:
 
 * `localesPath`: Path to application locales folder.

 * `locales`: Supported locales by your applications.

    Note: It is better to use [ISO-639](https://www.iso.org/iso-639-language-codes.html) language codes.

 * `defaultLocale`: default locale to your application.

<br />

3. Start linguify.

```bash
npx linguify
```

or

```bash
npx linguify start
```

 * Linguify server port can be changed using `-p` or `--port` option following the desired port

```bash
npx linguify -p 3000
```

 * Note: Updating `linguify.config.json` while Linguify runs requires restarting it before affecting it.

## How it works?

Linguify first validated the user config, then scans the `localesPath` for `namespaces`, read this article from [i18next documentation](https://www.i18next.com/principles/namespaces) if not sure how it works.

It uses `defaultLocale` as the base of translations and namespaces, and copies missing translations from `defaultLocale` namespaces to others. then you can modify them from the ui.

the `sync` operation happenes everytime Linguify starts, to sync translations manually you can use `sync` command.

```bash
npx linguify sync
```

<hr />

Please open an issue if any bugs arise. and any working pull request is welcome.

**Happy Internationalization!**