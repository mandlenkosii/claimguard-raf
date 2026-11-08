import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, CLIENT_OTHER_FIRM, COMPLETE, createClaim } from './helpers-claims';

const FIRM = 'a0000000-0000-4000-8000-000000000001';
const admin = adminClient();

describe('OP9 creating claims', () => {
  it('T-US7-1 and T-US8-1 a lawyer creates a draft for an authorised client and firm, with a unique reference', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const one = await createClaim(lawyer, CLIENT_NOMSA);
    const two = await createClaim(lawyer, CLIENT_NOMSA);
    expect(one.reference).toMatch(/^CG-\d{4}-\d{6}$/);
    expect(two.reference).not.toBe(one.reference);
    const { data } = await lawyer.from('claims').select('status, claimant_id, representing_organisation_id').eq('id', one.id).single();
    expect(data).toEqual({ status: 'draft', claimant_id: CLIENT_NOMSA, representing_organisation_id: FIRM });
  });

  it('T-US7-1 a lawyer cannot create a claim for another firm\'s client', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { error } = await lawyer.rpc('create_claim', { p_claimant_id: CLIENT_OTHER_FIRM, p_fields: {} });
    expect(error?.code).toBe('42501');
  });

  it('T-US7-2 a claimant\'s claim is linked to their own claimant record', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null);
    const { data } = await claimant.from('claims').select('claimant_id').eq('id', id).single();
    expect(data).toEqual({ claimant_id: 'b0000000-0000-4000-8000-000000000001' });
  });

  it.each(['officer.demo@example.com', 'investigator.demo@example.com', 'manager.demo@example.com', 'admin.demo@example.com'])('T-US7-3 %s cannot create a claim', async (email) => {
    const client = await signedIn(email);
    const { error } = await client.rpc('create_claim', { p_claimant_id: CLIENT_NOMSA, p_fields: {} });
    expect(error?.code).toBe('42501');
  });

  it('T-US10-1 a draft can be updated and stays a draft', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null);
    const { error } = await claimant.from('claims').update({ accident_town: 'Polokwane' }).eq('id', id);
    expect(error).toBeNull();
    const { data } = await claimant.from('claims').select('accident_town, status').eq('id', id).single();
    expect(data).toEqual({ accident_town: 'Polokwane', status: 'draft' });
  });

  it('T-S10 the fields sent at creation are stored', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { id } = await createClaim(claimant, null, COMPLETE);
    const { data } = await claimant.from('claims').select('accident_province, claimant_role').eq('id', id).single();
    expect(data).toEqual({ accident_province: 'Gauteng', claimant_role: 'driver' });
  });
});

describe('Assignments', () => {
  it('T-US12-1 and T-US12-2 an assignment appears on the claim, with audit and timeline records', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA);
    const officer = await signedIn('admin.demo@example.com');
    const { error } = await officer.rpc('assign_claim_staff', { p_claim: id, p_profile: '00000000-0000-4000-8000-000000000005', p_role: 'raf_officer' });
    expect(error).toBeNull();

    const { data: people } = await lawyer.rpc('get_claim_assignments', { p_claim: id });
    expect(people).toEqual(expect.arrayContaining([expect.objectContaining({ assignment_role: 'raf_officer', display_name: 'Demo RAF Officer' })]));

    const { data: timeline } = await admin.from('claim_timeline_events').select('event_type').eq('claim_id', id).eq('event_type', 'assignment_changed');
    expect(timeline!.length).toBe(1);
    const { data: audit } = await admin.from('audit_logs').select('action').eq('claim_id', id).eq('action', 'ASSIGNMENT_CHANGED');
    expect(audit!.length).toBe(1);
  });

  it('T-US12-1 a lawyer can see their own firm\'s assignment details', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { error } = await lawyer.rpc('get_claim_assignments', { p_claim: 'c0000000-0000-4000-8000-000000000003' });
    expect(error).toBeNull();
    const { data } = await lawyer.rpc('get_claim_assignments', { p_claim: 'c0000000-0000-4000-8000-000000000004' });
    expect(data).toEqual([]);
  });
});

describe('Lists', () => {
  it('T-EDGE-17 claims_list returns one page at a time with an exact total', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { data, count } = await lawyer.from('claims_list').select('id', { count: 'exact' }).order('updated_at', { ascending: false }).range(0, 1);
    expect(data!.length).toBe(2);
    expect(count!).toBeGreaterThan(2);
  });

  it('T-S10 a claim list row has the columns S10 needs', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { data } = await lawyer.from('claims_list').select('reference, claimant_name, accident_date, status, readiness_score, blocking_count, open_request_count, updated_at').eq('reference', 'CG-2026-000142').single();
    expect(data).toMatchObject({ claimant_name: 'Sipho Ndlovu', status: 'validation', accident_date: '2025-11-14' });
  });

  it('T-S31 the queue tabs are scoped to the officer', async () => {
    const officer = await signedIn('officer.demo@example.com');
    const { data: assigned, error } = await officer.rpc('claims_queue', { p_tab: 'assigned', p_page: 1, p_page_size: 100 });
    expect(error).toBeNull();
    const references = assigned.rows.map((row: { reference: string }) => row.reference);
    expect(references).toEqual(expect.arrayContaining(['CG-2026-000142']));
    expect(references).not.toContain('CG-2026-000141');
    expect(assigned.rows[0]).toEqual(expect.objectContaining({ days_in_stage: expect.any(Number), legal_representative: expect.anything() }));
  });
});

