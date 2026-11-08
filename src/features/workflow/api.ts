import { supabase } from '@/lib/supabase';

export type TransitionOptions = {
  allowed: Array<{ status: string; label: string }>;
  blocked: Array<{ status: string; label: string; reason: string }>;
};

export type TransitionResult = { ok: boolean; status?: string; code?: string; reason?: string; missing?: string[] };

/** OP14. */
export async function allowedTransitions(claimId: string): Promise<TransitionOptions> {
  const { data, error } = await supabase.rpc('allowed_transitions', { p_claim: claimId });
  if (error) throw error;
  return data as TransitionOptions;
}

/** OP13. */
export async function transitionStatus(input: { claimId: string; target: string; reason: string; note?: string; notify?: boolean }): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc('transition_claim_status', {
    p_claim: input.claimId,
    p_target: input.target,
    p_reason: input.reason,
    p_note: input.note ?? null,
    p_notify: input.notify ?? true,
  });
  if (error) throw error;
  return data as TransitionResult;
}
