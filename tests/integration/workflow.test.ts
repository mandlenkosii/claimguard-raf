import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, COMPLETE, createClaim, transition } from './helpers-claims';

const admin = adminClient();

describe('Workflow', () => {
  it('T-US9-2 and T-BR3-2 leaving Draft with missing fields is rejected and lists them', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, { accident_province: 'Gauteng' });
    const result = await transition(claimant, id, 'documents_needed');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('missing_fields');
    expect(result.missing).toEqual(['Accident date', 'Claimant role', 'Accident description']);
    const { data } = await claimant.from('claims').select('status').eq('id', id).single();
    expect(data).toEqual({ status: 'draft' });
  });

  it('T-US65-1 a complete draft moves to Documents Needed, with the reason on the timeline', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, COMPLETE);
    const result = await transition(claimant, id, 'documents_needed', 'All details entered');
    expect(result).toMatchObject({ ok: true, status: 'documents_needed' });
    const { data } = await claimant.from('claim_timeline_events').select('from_status, to_status, reason, actor_id, created_at').eq('claim_id', id).eq('event_type', 'status_changed').single();
    expect(data).toMatchObject({ from_status: 'draft', to_status: 'documents_needed', reason: 'All details entered', actor_id: '00000000-0000-4000-8000-000000000001' });
    expect(data!.created_at).toEqual(expect.any(String));
  });

  it('T-US66-1 a reason is required', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, COMPLETE);
    expect(await transition(claimant, id, 'documents_needed', '   ')).toMatchObject({ ok: false, code: 'reason_required' });
  });

  it('T-US65-2 and T-EDGE-3 a claimant cannot go from Draft to Settlement, and it is logged', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, COMPLETE);
    expect(await transition(claimant, id, 'settlement')).toMatchObject({ ok: false });
    const { data } = await admin.from('claim_timeline_events').select('event_type').eq('claim_id', id).eq('event_type', 'status_change_blocked');
    expect(data!.length).toBe(1);
  });

  it('T-BR2-2 a draft cannot go straight to Ready', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, COMPLETE);
    expect(await transition(claimant, id, 'ready')).toMatchObject({ ok: false });
  });

  it('T-US68-1 the server lists allowed transitions and blocked ones with their reason', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA, COMPLETE);
    const { data: options } = await lawyer.rpc('allowed_transitions', { p_claim: id });
    expect(options.allowed.map((option: { status: string }) => option.status)).toEqual(['documents_needed']);
    expect(options.blocked.map((option: { reason: string }) => option.reason)).toContain('Submitted — claim must be Ready first');
  });

  it('T-US65-3 and T-EDGE-2 a direct status update through the API is rejected', async () => {
    for (const email of ['claimant.demo@example.com', 'lawyer.demo@example.com', 'officer.demo@example.com', 'admin.demo@example.com']) {
      const client = await signedIn(email);
      const { error } = await client.from('claims').update({ status: 'settlement' }).eq('id', 'c0000000-0000-4000-8000-000000000003');
      expect(error?.code, email).toBe('42501');
    }
    const { data } = await admin.from('claims').select('status').eq('id', 'c0000000-0000-4000-8000-000000000003').single();
    expect(data).toEqual({ status: 'validation' });
  });

  it('T-EDGE-1 a user with no access gets a refusal that reveals nothing', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    expect(await transition(claimant, 'c0000000-0000-4000-8000-000000000003', 'ready')).toMatchObject({ ok: false, code: 'no_access' });
    const { data } = await claimant.rpc('allowed_transitions', { p_claim: 'c0000000-0000-4000-8000-000000000003' });
    expect(data).toEqual({ allowed: [], blocked: [] });
  });
});
