import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      lines: 0.9,
      branches: 0.9,
      statements: 0.9,
      functions: 0.9,
    },
  },
})
