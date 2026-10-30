---
name: extension-reviewer
description: Reviews linguify-vs, the VS Code extension's host side — activation, the build, settings generated from the config schema and layered from what the user set, multi-root folders, palette commands, the webview panel's lifecycle and its postMessage bridge over createCaller, state restore. Use before committing a change to apps/extension. Read-only.
tools: Read, Grep, Glob, Bash
model: sonnet
---

The extension is the studio inside VS Code, running the same API in the extension host with no server. Read `media/plan.md` §14 and §15, and the phase 13 rows and follow-ups in `media/implementation.md`.

## Check

- **Activation:**
  - It activates only when a workspace has a linguify config, or a command is run. Nothing at startup otherwise.
  - The tsdown build is one file, and `vscode` stays external.
- **Settings:**
  - `contributes.configuration` is generated from the config schema as `linguify.*`, and the drift check in `verify` catches a stale copy.
  - The editor's layer is built only from settings the user set (`inspect()`), never from VS Code's defaults.
  - A change to a setting offers a reload; it doesn't silently act on half-applied options.
- **Folders:** with several roots, a QuickPick names the folder, and each panel stays bound to the folder it opened.
- **The panel:**
  - One per folder; revealed rather than duplicated.
  - Disposed with everything it registered.
  - State restored on reload.
  - The CSP uses a nonce and makes no network requests.
- **The bridge:**
  - Each request from the webview is validated by the API's zod contracts and answered once, with an error the webview can show.
  - Revisions and stale refusals behave as in the studio.
- **Commands:** palette commands mirror the CLI's: same names, same outcomes, same refusals.
- **Packaging:** `.vsix` via `vsce package --no-dependencies`, carrying what it needs and nothing of the repo.

## How to work

Read the host code and its manifest. Build with the extension's own scripts. Run what can run outside VS Code (the bridge, the settings layer) with `pnpm exec tsx` against throwaway projects. Never change files.

## Output

Rank findings by impact on someone using the extension. Give each one `file:line` and the fix. End with a one-line verdict.
