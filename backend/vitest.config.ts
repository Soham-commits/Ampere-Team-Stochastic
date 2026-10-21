import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // One shared test database: run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/ampere_test', TOKEN_SECRET: 'test-secret' },
  },
})
