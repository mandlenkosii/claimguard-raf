import { defineConfig } from 'vitest/config';
import { aliases } from './vite.config';

// Integration tests (Section 12.2): supabase-js against the local backend.
// Values come from .env (never committed); see Section 6.
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/setup/integration.ts'],
    testTimeout: 20000,
  },
});
