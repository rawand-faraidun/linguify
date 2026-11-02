# <img src="https://github.com/rawand-faraidun/linguify/blob/main/assets/linguify.svg?raw=true" alt="" width="18px"/> linguify

A command line for an app's translation files: add, rename and remove keys in every locale at once, keep the
locales in step with the default, find what is missing, hand translators a spreadsheet and take it back, and
format every file the same way. `linguify studio` opens the same work as a table in your browser.

- Every change is checked before anything is written, and written whole or not at all.
- Every command can print JSON and exits non-zero on failure, so scripts and CI can rely on it.
- No watcher, no server left running, no network: linguify reads your files, changes them, and stops.

## Install

Linguify needs Node.js 24 or later. Install it in your project:

```bash
npm install --save-dev linguify
# or
pnpm add -D linguify
# or
yarn add -D linguify
```

## Start

```bash
npx linguify init
```

`init` asks where the files live, which locales you have, the default one, how to lay the files out and
whether keys have namespaces, then writes `linguify.config.json` and creates the locale files.
`linguify init --yes` takes the defaults without asking.

```json
{
	"$schema": "https://unpkg.com/linguify@2/schema.json",
	"path": "./locales",
	"locales": ["en", "ckb"],
	"default": "en"
}
```

The `$schema` line gives your editor completion and checks for every option. Then:

```bash
npx linguify key add common.save --value Save --yes   # add a key to every locale — --yes creates `common`
npx linguify sync                                     # give every locale the keys the default has
npx linguify diff                                     # see what each locale is missing
npx linguify studio                                   # work on it as a table in your browser
```

## Files

With the defaults, each locale is one JSON file — `locales/en.json`, `locales/ckb.json` — and the first part
of a key is its namespace: `common.save` is `save` in the `common` namespace.

```json
{
	"common": {
		"save": "Save",
		"cancel": "Cancel"
	}
}
```

Set `options.fileStructure` to `multi-file` for a file per namespace — `locales/en/common.json`. Turn
`description` on to keep a note beside each key, in `locales/_desc.json`, shown in the studio and carried
through export and import.

## Commands

| command | what it does |
|---|---|
| `init` | Write `linguify.config.json` and create the locale files |
| `config` | Print the resolved config, the file it came from, and which layer set each value |
| `key add <path>` | Add a key to every locale — `--value`, `--desc`, `-t <locale>=<text>` |
| `key set <path>` | Change a key's text in one locale or all, or its description — never creates one |
| `key rename <from> <to>` | Rename a key or a whole group in every locale, its description with it |
| `key remove <paths...>` | Remove keys or whole groups from every locale |
| `namespace add <name>` | Add an empty namespace to every locale |
| `namespace rename <from> <to>` | Rename a namespace in every locale, its keys and descriptions with it |
| `namespace remove <name>` | Remove a namespace and every key in it |
| `list locales` · `list namespaces` · `list keys` | Print what the project has |
| `sync` | Give every other locale the keys the default has; `--remove-unused` also removes the ones it no longer has |
| `diff` | Compare each locale with the default: missing, extra and empty keys; `--table` for one column per locale |
| `format` | Sort every locale's keys and lay out every file the same way — the only command that sorts |
| `export` | Write every key, in every locale, to a csv, tsv, json or xlsx file |
| `import` | Update and add keys from such a file — never removes one, and an empty cell changes nothing |
| `studio` | Open the translation table in your browser, on this machine only |

`linguify <command> --help` describes every option. Every command that writes takes `--dry-run`, which works
out what would change and writes nothing. Commands that remove ask first; `--yes` answers for you.

These options work on every command:

| option | what it does |
|---|---|
| `-c, --config <file>` | Use this config file instead of searching for one |
| `--cwd <folder>` | Run as if started in this folder |
| `--json` | Print one JSON object — `{ "ok": true, "data": … }` or `{ "ok": false, "error": … }` — and never ask anything |

### In CI

```bash
npx linguify format --check   # exits 1 when a file is not formatted, naming it
npx linguify diff --json      # what every locale is missing, for a script to read
```

A command that fails exits 1, with the reason — in `--json`, as `error.code` and `error.message`. `diff` only
reports, and always exits 0.

### Spreadsheets

`export` writes `key`, `description` (when on), the default locale, then the other locales — one row per key.
Give translators **xlsx** if they will open it in Excel: Excel opens csv files lossily, turning `007` into `7`.
csv and tsv carry a byte-order mark, so Excel reads them as UTF-8.

`import` reads the same layout back. It updates and adds keys and never removes one; an empty cell leaves the
text as it is. `--dry-run` shows what it would change first.

## The studio

```bash
npx linguify studio
```

The studio is the translation table in your browser: flat, tree and compact views, a search, a filter for
what each locale is missing, editing in place, adding and deleting keys and namespaces, sync, format, import
and export. It listens on your machine only (`127.0.0.1`, port `5678` or `studio.port`).

The studio watches nothing. If you edit the files by hand or run the CLI while it is open, press Refresh; a
change you make on top of files that changed on disk is refused rather than written over them. A change to
`linguify.config.json` needs only a refresh too — only a new port needs a restart.

## Config

`linguify.config.json`, found by searching up from the folder you run in. Every option has a default, so a
config can be as short as `{ "locales": ["en", "ckb"] }`.

| option | default | what it does |
|---|---|---|
| `path` | `./locales` | Where the locale files live, from the config file |
| `locales` | `["en"]` | The locales the project has |
| `default` | `en` | The locale every other is compared with and synced from; one of `locales` |
| `engine` | `json` | The file format |
| `options.fileStructure` | `single-file` | `single-file` — `en.json` per locale — or `multi-file` — `en/common.json` per namespace |
| `options.namespaces` | `true` | Whether a key's first part is its namespace; multi-file is always namespaced |
| `options.indentation` | `2` | Spaces per level — with tabs, each level is one tab; `0` writes each file on one line |
| `options.indentationStyle` | `tab` | `tab` or `space` |
| `options.finalNewline` | `true` | End every file with a newline |
| `description` | `false` | `true`, or `{ "enabled": true, "name": "_desc.json" }`, to keep a description beside each key |
| `sync.removeUnused` | `false` | `sync` also removes the keys the default no longer has |
| `keys.fillWithDefault` | `false` | A new key gives the locales left blank the default's text instead of `""` |
| `keys.createNamespace` | `false` | A new key may name a namespace that is not there yet; it is created with it |
| `studio.port` | `5678` | The port the studio listens on |
| `studio.open` | `true` | Open a browser when the studio starts |
| `studio.defaultView` | `flat` | The view the studio opens in: `flat`, `tree` or `compact` |
| `extension.defaultView` | `flat` | The same, for the VS Code extension |
| `io.format` | `csv` | The format `export` and `import` use when neither `-f` nor the file's extension names one |

A command's flags win over the config, and the config wins over editor settings. `linguify config` shows the
value of every option and where it came from.

## In VS Code

**Linguify** for VS Code and OpenVSX (`linguify-vs`) shows the same table in an editor panel, and runs `sync`,
`format`, `diff`, `export` and `import` from the command palette. Every option above is also a VS Code
setting, `linguify.*`; the project's config wins over it.

## Upgrading from v1

v2 is a rewrite. Your translation files are read as they are, but the config's names changed and some
defaults flipped. Rewrite `linguify.config.json` by hand:

| v1 | v2 | note |
|---|---|---|
| `localesPath` | `path` | The default is now `./locales`, not `./public/locales` |
| `locales` | `locales` | Unchanged |
| `defaultLocale` | `default` | |
| `useSingleFile: false` | `options.fileStructure: "multi-file"` | **The default flipped**: v2 assumes one file per locale. Set `multi-file` to keep v1's folder per locale with a file per namespace |
| `useSingleFile: true` | `options.fileStructure: "single-file"` | The default now |
| `jsonIndentation` | `options.indentation` | v1 wrote each file on one line (`0`); v2 indents by default, with tabs. `0` keeps one line; `options.indentationStyle: "space"` with a width keeps spaces. Or run `linguify format` once to adopt the new layout |

A v1 config, as `init` wrote it:

```json
{
	"localesPath": "./public/locales",
	"locales": ["en", "ckb"],
	"defaultLocale": "en",
	"useSingleFile": false,
	"jsonIndentation": 0
}
```

The same project in v2:

```json
{
	"$schema": "https://unpkg.com/linguify@2/schema.json",
	"path": "./public/locales",
	"locales": ["en", "ckb"],
	"default": "en",
	"options": {
		"fileStructure": "multi-file",
		"indentation": 0
	}
}
```

What else changed:

- **`linguify` alone no longer starts the server.** Run `linguify studio`; `-p` / `--port` is the same.
- **Nothing syncs on its own.** v1 synced every time it started; run `linguify sync` when you want it.
- **Export and import** take csv, tsv, json or xlsx, csv by default, and write to `./translations.csv` in the
  folder you run in rather than inside the locales folder. `export -p translations.xlsx` writes xlsx as v1 did.
- **Errors exit 1.** v1 printed an error and still exited 0; scripts that relied on that will now see the
  failure.
- **Refused, not overwritten**: a key that would sit under a text, a name used twice, or files changed on disk
  since they were read stop the command before anything is written.
- **Node.js 24 or later.**

## Licence

MIT © Rawand Faraidun
