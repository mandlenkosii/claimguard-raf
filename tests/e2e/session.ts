import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');

// The hosted project limits sign-ins, so each demo role signs in once and the browser reuses that session.
const FILE = join(tmpdir(), 'claimguard-e2e-sessions.json');
type Saved = Record<string, { expires_at: number } & Record<string, unknown>>;
const load = (): Saved => (existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Saved) : {});

export async function sessionFor(email: string) {
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const saved = load()[email];
  // A sign-out test ends every session for that user, so a saved session must still be live.
  if (saved && saved.expires_at * 1000 > Date.now() + 900_000) {
    const { error } = await client.auth.getUser(saved.access_token as string);
    if (!error) return saved;
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password: process.env.DEMO_USER_PASSWORD! });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}`);
  writeFileSync(FILE, JSON.stringify({ ...load(), [email]: data.session }));
  return data.session as unknown as Saved[string];
}

export async function useSession(page: Page, email: string) {
  const session = await sessionFor(email);
  const key = `sb-${new URL(process.env.VITE_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(([name, value]) => window.localStorage.setItem(name!, value!), [key, JSON.stringify(session)]);
}

export const SEED = {
  thandiwe: 'c0000000-0000-4000-8000-000000000002',
  sipho: 'c0000000-0000-4000-8000-000000000003',
  pieter: 'c0000000-0000-4000-8000-000000000004',
  lerato: 'c0000000-0000-4000-8000-000000000005',
  alert: 'e0000000-0000-4000-8000-000000000001',
};
