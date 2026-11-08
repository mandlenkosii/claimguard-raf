import type { SupabaseClient } from '@supabase/supabase-js';

export const COMPLETE = { claimant_role: 'driver', accident_date: '2026-01-15', accident_province: 'Gauteng', accident_description: 'Fictional test accident.' };

export const CLIENT_NOMSA = 'b0000000-0000-4000-8000-000000000003';
export const CLIENT_OTHER_FIRM = 'b0000000-0000-4000-8000-000000000004';

export async function createClaim(client: SupabaseClient, claimantId: string | null, fields: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc('create_claim', { p_claimant_id: claimantId, p_fields: fields });
  if (error) throw new Error(`create_claim failed: ${error.message}`);
  return data as { id: string; reference: string };
}

export async function transition(client: SupabaseClient, id: string, target: string, reason = 'Integration test') {
  const { data, error } = await client.rpc('transition_claim_status', { p_claim: id, p_target: target, p_reason: reason });
  if (error) throw new Error(`transition failed: ${error.message}`);
  return data as { ok: boolean; status?: string; code?: string; reason?: string; missing?: string[] };
}
