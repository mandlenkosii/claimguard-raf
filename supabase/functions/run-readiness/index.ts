// OP24: "Re-run checks". Anyone with access to the claim may run it; the save itself is server-only.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { runAssessment } from '../_shared/runAssessment.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const options = { auth: { persistSession: false, autoRefreshToken: false } };

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'not_allowed' });

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'unauthorised' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user } = await caller.auth.getUser(token);
  if (!user.user) return reply(401, { error: 'unauthorised' });

  const body = await request.json().catch(() => null);
  const claimId = typeof body?.claim_id === 'string' ? body.claim_id : '';
  if (!claimId) return reply(400, { error: 'claim_id required' });

  const { data: allowed } = await caller.rpc('can_access_claim', { p_claim: claimId });
  const { data: active } = await caller.rpc('is_active_user');
  if (allowed !== true || active !== true) return reply(403, { error: 'forbidden' });

  try {
    await runAssessment(createClient(url, Deno.env.get('PROCESS_DOCUMENT_KEY')!, options), claimId, user.user.id);
    return reply(200, { status: 'assessed' });
  } catch (error) {
    console.error('run-readiness failed', error instanceof Error ? error.message : 'unknown');
    return reply(500, { error: 'failed' });
  }
});
