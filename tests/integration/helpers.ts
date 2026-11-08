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

export async function signedIn(email: string, password = process.env.DEMO_USER_PASSWORD!): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
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
