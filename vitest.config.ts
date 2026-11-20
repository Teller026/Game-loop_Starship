import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'client/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['shared/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        'shared/src/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85
        }
      }
    }
  }
});