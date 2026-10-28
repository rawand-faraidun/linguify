import { storageKeys, studioDefaultPort, studioHost, studioRoutes } from '@linguify/constants'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * the studio the dev server forwards the API to — `linguify studio` on its default port
 */
const studio = `http://${studioHost}:${studioDefaultPort}`

/**
 * sets the theme's class before the page paints, from the stored choice or the system — without it,
 * dark mode would flash light until React mounts
 */
const themeBeforePaint: Plugin = {
	name: 'linguify-theme-before-paint',
	transformIndexHtml: () => [
		{
			tag: 'script',
			injectTo: 'head-prepend',
			children: `try{const t=localStorage.getItem(${JSON.stringify(storageKeys.theme)});if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}`
		}
	]
}

export default defineConfig({
	plugins: [react(), tailwindcss(), themeBeforePaint],
	server: {
		proxy: {
			// the studio answers only to its own origin, so the forwarded request carries it
			[studioRoutes.trpc]: { target: studio, changeOrigin: true, headers: { origin: studio } }
		}
	}
})
