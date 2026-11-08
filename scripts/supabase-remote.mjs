// Runs a Supabase CLI database command against the hosted project (Section 18 #46).
// The connection string comes only from .env (never committed, Section 6).
// Usage: node scripts/supabase-remote.mjs test db
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('.env')) {
  console.error('Missing .env. Copy .env.example to .env and fill it from your Supabase project (Section 6).');
  process.exit(1);
}
process.loadEnvFile('.env');

const dbUrl = process.env.SUPABASE_DB_URL ?? '';
if (!dbUrl || dbUrl.includes('replace-with')) {
  console.error('SUPABASE_DB_URL in .env is not set to your Supabase connection string (Section 6).');
  process.exit(1);
}

const args = ['supabase', ...process.argv.slice(2), `--remote=${dbUrl}`, '--yes'];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
