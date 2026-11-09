// Sends the Edge Function secrets and deploys the functions to the hosted project, without Docker (Section 18 #46).
// Needs SUPABASE_ACCESS_TOKEN in .env. Values are never printed.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const FUNCTIONS = ['demo-sign-in', 'process-document', 'run-readiness', 'admin-invite-user'];

if (!existsSync('.env')) {
  console.error('Missing .env (Section 6).');
  process.exit(1);
}
process.loadEnvFile('.env');

const { SUPABASE_ACCESS_TOKEN: token, VITE_SUPABASE_URL: url, DEMO_USER_PASSWORD, DEMO_LOGIN_ENABLED, OCR_PROVIDER, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!token || token.includes('replace-with')) {
  console.error('Set SUPABASE_ACCESS_TOKEN in .env (Section 6).');
  process.exit(1);
}

const ref = new URL(url).hostname.split('.')[0];
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify([
    { name: 'DEMO_USER_PASSWORD', value: DEMO_USER_PASSWORD },
    { name: 'DEMO_LOGIN_ENABLED', value: DEMO_LOGIN_ENABLED },
    { name: 'OCR_PROVIDER', value: OCR_PROVIDER },
    { name: 'PROCESS_DOCUMENT_KEY', value: SUPABASE_SERVICE_ROLE_KEY },
  ]),
});
if (!response.ok) {
  console.error(`Could not set the function secrets (HTTP ${response.status}).`);
  process.exit(1);
}
console.log('Function secrets set.');

const result = spawnSync('npx', ['supabase', 'functions', 'deploy', ...FUNCTIONS, '--use-api', `--remote=${ref}`, '--yes'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
});
process.exit(result.status ?? 1);
