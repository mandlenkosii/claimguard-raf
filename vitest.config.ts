import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { aliases } from './vite.config';

// Unit and component tests (Section 12.2): tests/unit and tests/component.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: aliases },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup/component.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
    css: false,
    // Placeholders only: component tests make no network calls (Section 12.4).
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key', VITE_APP_ENV: 'test' },
    coverage: {
      provider: 'v8',
      include: ['supabase/functions/_shared/rules/**/*.ts'],
      thresholds: { lines: 80 },
    },
  },
});
