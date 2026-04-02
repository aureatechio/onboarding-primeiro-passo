import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Default suite avoids network-dependent E2E specs.
    // E2E must run explicitly via scripts targeting tests/e2e.
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    testTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
  },
})
