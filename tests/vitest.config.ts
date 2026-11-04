import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		passWithNoTests: true,
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					include: ['**/*.test.ts'],
					environment: 'node',
					setupFiles: ['setup/index.ts']
				}
			},
			{
				extends: true,
				test: {
					name: 'dom',
					include: ['**/*.test.tsx'],
					environment: 'jsdom',
					setupFiles: ['setup/index.ts', 'setup/dom.ts']
				}
			}
		]
	}
})
