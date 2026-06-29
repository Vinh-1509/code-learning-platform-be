import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup/env.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/services/**/*.ts',
        'src/utils/**/*.ts',
        'src/middlewares/**/*.ts',
        'src/controllers/**/*.ts',
      ],
      exclude: ['**/*.test.ts', 'tests/**'],
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 70,
      //   statements: 80,
      // },
    },
    testTimeout: 15000, // 15 seconds
    hookTimeout: 15000, // 15 seconds
  },
});
