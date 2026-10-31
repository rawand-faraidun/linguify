import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: 'src/index.ts',
	format: 'cjs',
	platform: 'node',
	target: 'node20',
	outDir: 'dist',
	fixedExtension: false,
	sourcemap: true,
	deps: { neverBundle: ['vscode'] }
})
