import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['**/*.test.ts'],
		passWithNoTests: true,
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true
	}
})
