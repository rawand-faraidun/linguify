import { storageKeys, studioDefaultPort, studioHost, studioRoutes, studioText } from '@linguify/constants'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * the studio the dev server forwards the API to — `linguify studio` on its default port
 */
const studio = `http://${studioHost}:${studioDefaultPort}`

/**
 * the page's head: its title, and the theme set before the page paints, from the stored choice or the
 * system — without it, dark mode would flash light until React mounts, and scrollbars and form controls
 * would keep the system's colours until then
 */
const studioHead: Plugin = {
	name: 'linguify-studio-head',
	transformIndexHtml: () => [
		{ tag: 'title', injectTo: 'head', children: studioText.title },
		{
			tag: 'script',
			injectTo: 'head-prepend',
			children: `try{const t=localStorage.getItem(${JSON.stringify(storageKeys.theme)}),d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches),r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch{}`
		}
	]
}

export default defineConfig({
	plugins: [react(), tailwindcss(), studioHead],
	server: {
		proxy: {
			// the studio answers only to its own origin, so the forwarded request carries it
			[studioRoutes.trpc]: { target: studio, changeOrigin: true, headers: { origin: studio } }
		}
	}
})
