// OP8: signs in a fictional demo account on the server (Section 18 #9). It accepts only a role key,
// so it can never reach any other account, and the demo password never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const DEMO_ACCOUNTS: Record<string, string> = {
  claimant: 'claimant.demo@example.com',
  lawyer: 'lawyer.demo@example.com',
  raf_officer: 'officer.demo@example.com',
  investigator: 'investigator.demo@example.com',
  manager: 'manager.demo@example.com',
  admin: 'admin.demo@example.com',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'not_allowed' });
  if (Deno.env.get('DEMO_LOGIN_ENABLED') !== 'true') return reply(403, { error: 'disabled' });

  const body = await request.json().catch(() => null);
  const email = typeof body?.role === 'string' && Object.hasOwn(DEMO_ACCOUNTS, body.role) ? DEMO_ACCOUNTS[body.role] : undefined;
  if (!email) return reply(400, { error: 'invalid_role' });

  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: Deno.env.get('DEMO_USER_PASSWORD')! });
  if (error || !data.session) return reply(500, { error: 'sign_in_failed' });

  return reply(200, { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
