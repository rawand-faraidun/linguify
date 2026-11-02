# <img src="https://github.com/rawand-faraidun/linguify/blob/main/assets/linguify.svg?raw=true" alt="" width="18px"/> linguify

A translation file manager for developers — a command line, a studio in the browser, and a VS Code extension,
all working on your app's translation files the same way.

| package | what it is | where |
|---|---|---|
| [`linguify`](apps/cli) | The command line, with `linguify studio` | [npm](https://www.npmjs.com/package/linguify) — [read me](apps/cli/README.md), including **Upgrading from v1** |
| [`linguify-vs`](apps/extension) | The VS Code extension | VS Code Marketplace and OpenVSX |

## Working on linguify

The repository is a pnpm workspace on Node.js 24, built with Turborepo.

```bash
pnpm install
pnpm build    # every package
pnpm verify   # lint, typecheck, build and the extension manifest check — what CI runs
```

`apps/` holds what is published — the CLI, the studio's client and server, the extension — and `packages/`
what they share: the core operations and file formats, the API, the table's logic, the studio's UI pieces, keys, types and constants.

MIT © Rawand Faraidun
