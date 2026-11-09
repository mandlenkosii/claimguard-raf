import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const options = { auth: { persistSession: false, autoRefreshToken: false } };

export const ids = {
  claimant: '00000000-0000-4000-8000-000000000001',
  claimant2: '00000000-0000-4000-8000-000000000002',
  manager: '00000000-0000-4000-8000-000000000007',
  admin: '00000000-0000-4000-8000-000000000008',
};

export const anonClient = (): SupabaseClient => createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);

export const adminClient = (): SupabaseClient => createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);

// The hosted project limits sign-ins per IP, so demo-user sessions are reused between test files.
const SESSION_FILE = join(tmpdir(), 'claimguard-integration-sessions.json');
type SavedSession = { access_token: string; refresh_token: string; expires_at: number };

function savedSessions(): Record<string, SavedSession> {
  return existsSync(SESSION_FILE) ? (JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as Record<string, SavedSession>) : {};
}

export async function signedIn(email: string, password = process.env.DEMO_USER_PASSWORD!): Promise<SupabaseClient> {
  const client = anonClient();
  const reusable = password === process.env.DEMO_USER_PASSWORD;
  const saved = reusable ? savedSessions()[email] : undefined;
  if (saved && saved.expires_at * 1000 > Date.now() + 600_000) {
    const { error } = await client.auth.setSession(saved);
    if (!error) return client;
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  if (reusable) {
    const { access_token, refresh_token, expires_at } = data.session;
    writeFileSync(SESSION_FILE, JSON.stringify({ ...savedSessions(), [email]: { access_token, refresh_token, expires_at: expires_at! } }));
  }
  return client;
}

/**
 * Hosted Supabase rejects @example.com on the public sign-up endpoint (Section 18 #50), so these
 * accounts are created through the admin API with the same user metadata; handle_new_user decides the rest.
 */
export async function createTestUser(metadata: Record<string, unknown>, password = 'Test-pass-12345') {
  const email = `t.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error) throw new Error(`Could not create a test user: ${error.message}`);
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(id: string) {
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error) throw new Error(`Could not remove a test user: ${error.message}`);
}
