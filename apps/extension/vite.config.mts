import { webviewFiles } from '@linguify/constants'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	base: './',
	build: {
		outDir: `dist/${webviewFiles.folder}`,
		emptyOutDir: true,
		modulePreload: false,
		cssCodeSplit: false,
		rolldownOptions: {
			input: 'src/webview/main.tsx',
			output: {
				entryFileNames: webviewFiles.script,
				assetFileNames: ({ names }) =>
					names.some(name => name.endsWith('.css')) ? webviewFiles.style : 'assets/[name]-[hash][extname]'
			}
		}
	}
})
