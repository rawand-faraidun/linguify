import { defineConfig } from 'tsdown'

/**
 * the third-party packages bundled into the CLI rather than installed beside it — `@trpc/server`, whose
 * peer dependency on TypeScript would otherwise install TypeScript for every user
 */
export const bundledPackages = ['@trpc/server']

export default defineConfig({
	entry: 'src/index.ts',
	format: 'esm',
	platform: 'node',
	target: 'node24',
	outDir: 'dist',
	fixedExtension: false,
	deps: { alwaysBundle: [/^@linguify\//, ...bundledPackages] }
})
