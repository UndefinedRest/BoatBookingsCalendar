import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        // Temporarily exclude server layer (not affected by Phase 1 config refactoring)
        'src/server/**',
        'src/index.ts',
        // Exclude non-core services (not affected by Phase 1)
        'src/services/tvDisplayConfigService.ts',
        'src/services/bookingAggregationService.ts',
        'src/models/tv-display-config.ts',
      ],
      all: true,
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
