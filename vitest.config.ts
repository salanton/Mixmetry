import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: [
        'src/data/fertilizerLibrary.ts',
        'src/data/fertilizers/**/*.ts',
        'src/hooks/usePersistentFertilizers.ts',
        'src/hooks/usePersistentParams.ts',
        'src/utils/**/*.ts',
      ],
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 55,
        lines: 70,
      },
    },
  },
})
