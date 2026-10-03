import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __PKG_VERSION__: JSON.stringify('0.0.0-test'),
    __PKG_NAME__: JSON.stringify('@ricardogenaro99/scaffolder'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/commands/**', 'src/ui/**'],
      reporter: ['text', 'html'],
    },
  },
});
