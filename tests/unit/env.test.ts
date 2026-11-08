import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..', '..');

// Section 6: every variable the app, functions, scripts and tests use.
const SECTION_6_VARIABLES = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_ENV',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'DEMO_USER_PASSWORD',
  'DEMO_LOGIN_ENABLED',
  'OCR_PROVIDER',
  'SUPABASE_ACCESS_TOKEN',
];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('T-SETUP-6 / T-SETUP-7 environment variables and secrets', () => {
  it('T-SETUP-6 .gitignore lists .env and .env.example lists every Section 6 variable', () => {
    const gitignore = readFileSync(join(root, '.gitignore'), 'utf8').split(/\r?\n/).map((line) => line.trim());
    expect(gitignore).toContain('.env');

    const example = readFileSync(join(root, '.env.example'), 'utf8');
    const names = example
      .split(/\r?\n/)
      .filter((line) => line.includes('='))
      .map((line) => line.split('=')[0]?.trim());
    expect(names).toEqual(SECTION_6_VARIABLES);
  });

  it('T-SETUP-7 no file in src/ mentions SERVICE_ROLE or any non-VITE_ secret name', () => {
    const secretNames = SECTION_6_VARIABLES.filter((name) => !name.startsWith('VITE_'));
    const offenders = listFiles(join(root, 'src')).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return text.includes('SERVICE_ROLE') || secretNames.some((name) => text.includes(name));
    });
    expect(offenders).toEqual([]);
  });
});
