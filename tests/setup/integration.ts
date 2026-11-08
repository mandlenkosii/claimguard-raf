import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Integration tests read real local values from .env (never committed, Section 6).
const envFile = resolve(process.cwd(), '.env');
if (!existsSync(envFile)) {
  throw new Error(
    'Integration tests need a .env file. Copy .env.example to .env and fill it from `npx supabase status` (Section 6).',
  );
}
process.loadEnvFile(envFile);
