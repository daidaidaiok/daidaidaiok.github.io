import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
      app: `${rootDir}/app`,
    },
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'out', '.next', '.contentlayer'],
    coverage: {
      provider: 'v8',
      exclude: [
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.{js,mjs,ts,mts}',
        '**/.contentlayer/**',
      ],
      reporter: ['text', 'lcov', 'html'],
    },
  },
})
