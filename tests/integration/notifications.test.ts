import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim, COMPLETE, transition } from './helpers-claims';

const admin = adminClient();
const OFFICER = '00000000-0000-4000-8000-000000000005';
const ADMIN = '00000000-0000-4000-8000-000000000008';
const LAWYER = '00000000-0000-4000-8000-000000000003';
const rows = async (recipient: string, claim: string) => (await admin.from('notifications').select('type, summary').eq('recipient_id', recipient).eq('claim_id', claim)).data!;

describe('Notifications', () => {
  it('T-US70-1 a request, response, assignment and status change notify the right people', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const officer = await signedIn('officer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA, COMPLETE);
    await admin.from('claim_assignments').insert({ claim_id: id, profile_id: OFFICER, assignment_role: 'raf_officer', assigned_by: ADMIN });
    expect((await rows(OFFICER, id)).map((row) => row.type)).toEqual(['assignment']);

    const { data: request } = await officer.rpc('create_information_request', { p_claim: id, p_title: 'T', p_description: 'D', p_recipient_type: 'legal_representative', p_linked_issue: null, p_requests_documents: false, p_due_date: null });
    expect((await rows(LAWYER, id)).map((row) => row.type)).toContain('request');
    await lawyer.rpc('respond_to_request', { p_request: request, p_body: 'B', p_document_ids: [] });
    expect((await rows(OFFICER, id)).map((row) => row.type)).toContain('response');

    expect((await transition(lawyer, id, 'documents_needed')).ok).toBe(true);
    expect((await rows(OFFICER, id)).map((row) => row.type)).toContain('claim_update');
    expect((await rows(LAWYER, id)).map((row) => row.type)).not.toContain('claim_update');
  });

  it('T-US73-1 the summary holds only the event and the claim reference', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { id, reference } = await createClaim(lawyer, CLIENT_NOMSA);
    await admin.from('claim_assignments').insert({ claim_id: id, profile_id: OFFICER, assignment_role: 'raf_officer', assigned_by: ADMIN });
    expect((await rows(OFFICER, id))[0]!.summary).toBe(`You have been assigned to claim ${reference}.`);
  });

  it('T-US71-1 a user marks only their own as read', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const officer = await signedIn('officer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA);
    await admin.from('claim_assignments').insert({ claim_id: id, profile_id: OFFICER, assignment_role: 'raf_officer', assigned_by: ADMIN });
    const { data: note } = await admin.from('notifications').select('id').eq('recipient_id', OFFICER).eq('claim_id', id).single();
    await lawyer.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', note!.id);
    expect((await admin.from('notifications').select('read_at').eq('id', note!.id).single()).data!.read_at).toBeNull();
    await officer.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', note!.id);
    expect((await admin.from('notifications').select('read_at').eq('id', note!.id).single()).data!.read_at).not.toBeNull();
  });
});
