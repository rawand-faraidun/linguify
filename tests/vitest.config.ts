import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['**/*.test.ts'],
		setupFiles: ['setup/index.ts'],
		passWithNoTests: true,
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true
	}
})
