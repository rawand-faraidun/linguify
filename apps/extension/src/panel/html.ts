/**
 * the page the panel shows: the webview's script and stylesheet under a policy that lets nothing else in
 *
 * @note `default-src 'none'` refuses everything not named after it: no network — the webview reaches the
 * project only through the host — no inline script, no eval. The script runs by its nonce, fresh for each
 * page; styles, fonts and images come only from the extension's own files
 *
 * @param page - `cspSource`, the webview's own origin for the extension's files; `nonce`, unguessable and
 * new each time; `script` and `style`, their webview URIs; `title`, which may name a folder, so is escaped
 *
 * @returns the page's HTML
 */
export const panelHtml = ({
	cspSource,
	nonce,
	script,
	style,
	title
}: {
	cspSource: string
	nonce: string
	script: string
	style: string
	title: string
}): string => {
	const policy = [
		"default-src 'none'",
		"base-uri 'none'",
		"form-action 'none'",
		`script-src 'nonce-${nonce}'`,
		`style-src ${cspSource}`,
		`font-src ${cspSource}`,
		`img-src ${cspSource} data:`
	].join('; ')
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta http-equiv="Content-Security-Policy" content="${policy}" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(title)}</title>
		<link rel="stylesheet" href="${style}" />
	</head>
	<body>
		<div id="root"></div>
		<script type="module" nonce="${nonce}" src="${script}"></script>
	</body>
</html>
`
}

/**
 * @param text - text to put into HTML
 *
 * @returns it with the characters HTML gives meaning to written as entities
 */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`)
