import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.{test,spec}.{js,ts}'],
    testTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
  },
})
