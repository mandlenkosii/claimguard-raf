import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const OUT = join('node_modules', '.cache', 'bundle-check');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('T-NFR-10 production bundle', () => {
  afterAll(() => rmSync(OUT, { recursive: true, force: true }));

  it('contains no service key, database URL or demo password', () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', OUT, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'pipe' });
    const bundle = files(OUT).map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(bundle.length).toBeGreaterThan(1000);
    expect(bundle).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
    expect(bundle).not.toMatch(/service_role/);
    expect(bundle).not.toMatch(/postgres(ql)?:\/\//);
    for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'DEMO_USER_PASSWORD']) {
      const value = process.env[name];
      if (value) expect(bundle.includes(value), `${name} is in the bundle`).toBe(false);
    }
  }, 180000);
});
