// OP42: creates an invited staff account. The service key is used only after the caller is confirmed as an active admin.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const ROLES = ['claimant', 'lawyer', 'raf_officer', 'investigator', 'manager', 'admin'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'not_allowed' });

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'unauthorised' });
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user } = await caller.auth.getUser(token);
  if (!user.user) return reply(401, { error: 'unauthorised' });
  const [{ data: active }, { data: isAdmin }] = await Promise.all([caller.rpc('is_active_user'), caller.rpc('has_role', { p_role: 'admin' })]);
  if (active !== true || isAdmin !== true) return reply(403, { error: 'forbidden' });

  const body = await request.json().catch(() => null);
  const email = text(body?.email).toLowerCase();
  const firstName = text(body?.first_name);
  const surname = text(body?.surname);
  const reason = text(body?.reason);
  const roles: string[] = Array.isArray(body?.roles) ? body.roles : [];
  const organisationId = typeof body?.organisation_id === 'string' ? body.organisation_id : null;
  if (!EMAIL.test(email) || !firstName || !surname || !reason || !roles.length || roles.some((role) => !ROLES.includes(role))) return reply(400, { error: 'invalid' });

  const admin = createClient(url, Deno.env.get('PROCESS_DOCUMENT_KEY')!, options);
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    // Auth applies app_metadata after the sign-up trigger runs, so the account starts on the
    // self-registration path and is converted to invited staff here, before it can ever sign in.
    user_metadata: { account_type: 'claimant', first_name: firstName, surname, popia_consent: true },
  });
  if (error || !created.user) return reply(409, { error: 'not_created' });
  const userId = created.user.id;

  const converted = await admin.from('profiles').update({ account_type: 'staff', account_status: 'invited', popia_consent_at: null }).eq('id', userId);
  const cleared = await admin.from('user_roles').delete().eq('user_id', userId);
  const saved = await admin.from('user_roles').insert(roles.map((role) => ({ user_id: userId, role_key: role, assigned_by: user.user.id, reason })));
  const member = organisationId ? await admin.from('organisation_members').insert({ organisation_id: organisationId, profile_id: userId }) : { error: null };
  if (converted.error || cleared.error || saved.error || member.error) {
    await admin.auth.admin.deleteUser(userId);
    return reply(500, { error: 'not_created' });
  }
  await admin.from('audit_logs').insert({ actor_id: user.user.id, actor_role: 'admin', action: 'USER_INVITED', resource_type: 'user', resource_id: userId, change_summary: { roles }, reason });

  // Fictional @example.com addresses cannot receive mail, and sending to them harms the project's email standing.
  if (!email.endsWith('@example.com')) {
    const origin = request.headers.get('origin');
    await admin.auth.resetPasswordForEmail(email, origin ? { redirectTo: `${origin}/reset-password` } : undefined);
  }
  return reply(200, { user_id: userId });
});
