import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';

const admin = adminClient();
const OFFICER = '00000000-0000-4000-8000-000000000005';
const ADMIN = '00000000-0000-4000-8000-000000000008';
const CLAIMANT = '00000000-0000-4000-8000-000000000001';
const LAWYER = '00000000-0000-4000-8000-000000000003';
type Client = Awaited<ReturnType<typeof signedIn>>;

const assignOfficer = (claimId: string) => admin.from('claim_assignments').insert({ claim_id: claimId, profile_id: OFFICER, assignment_role: 'raf_officer', assigned_by: ADMIN });

async function lawyerClaim() {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id } = await createClaim(lawyer, CLIENT_NOMSA);
  await assignOfficer(id);
  return { lawyer, id, officer: await signedIn('officer.demo@example.com') };
}
async function claimantClaim() {
  const claimant = await signedIn('claimant.demo@example.com');
  const { id } = await createClaim(claimant, null);
  await assignOfficer(id);
  return { claimant, id, officer: await signedIn('officer.demo@example.com') };
}
const create = (client: Client, claim: string, recipient = 'claimant', due: string | null = null) =>
  client.rpc('create_information_request', { p_claim: claim, p_title: 'Provide report', p_description: 'Please provide it.', p_recipient_type: recipient, p_linked_issue: null, p_requests_documents: true, p_due_date: due });
const respond = (client: Client, request: string, body = 'Here it is.', documents: string[] = []) => client.rpc('respond_to_request', { p_request: request, p_body: body, p_document_ids: documents });
const setStatus = (client: Client, request: string, status: string) => client.rpc('update_request_status', { p_request: request, p_status: status });
const status = async (id: string) => (await admin.from('information_requests').select('status').eq('id', id).single()).data!.status;
const notifications = async (recipient: string, claim: string, type: string) => (await admin.from('notifications').select('summary').eq('recipient_id', recipient).eq('claim_id', claim).eq('type', type)).data!;

describe('Information requests', () => {
  it('T-US53-1 the assigned officer creates a request; the created date and status are stored', async () => {
    const { officer, id } = await claimantClaim();
    const { data, error } = await create(officer, id, 'claimant', '2026-12-31');
    expect(error).toBeNull();
    const { data: row } = await admin.from('information_requests').select('*').eq('id', data).single();
    expect(row).toMatchObject({ status: 'pending', title: 'Provide report', requests_documents: true, due_date: '2026-12-31', created_by: OFFICER });
    expect(row.created_at).toBeTruthy();
  });

  it.each(['claimant.demo@example.com', 'lawyer.demo@example.com', 'investigator.demo@example.com', 'manager.demo@example.com', 'admin.demo@example.com'])('T-US53-1 %s cannot create a request', async (email) => {
    const { id } = await lawyerClaim();
    expect((await create(await signedIn(email), id)).error?.code).toBe('42501');
  });

  it('T-US53-1 an officer not assigned to the claim cannot create a request', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA);
    expect((await create(await signedIn('officer.demo@example.com'), id)).error?.code).toBe('42501');
  });

  it('T-US53-1 a linked issue must belong to the claim', async () => {
    const { officer, id } = await lawyerClaim();
    const { error } = await officer.rpc('create_information_request', { p_claim: id, p_title: 'T', p_description: 'D', p_recipient_type: 'claimant', p_linked_issue: '00000000-0000-4000-8000-0000000000aa', p_requests_documents: false, p_due_date: null });
    expect(error).not.toBeNull();
  });

  it('T-US55-1 and T-US55-3 the recipient responds with text and documents; it is Responded, not Closed', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    const documentId = crypto.randomUUID();
    await admin.from('documents').insert({ id: documentId, claim_id: id, category_key: 'identity_document', uploaded_by: CLAIMANT });
    expect((await respond(claimant, request, 'Here it is.', [documentId])).error).toBeNull();
    expect(await status(request)).toBe('responded');
    const { data: response } = await admin.from('request_responses').select('body, document_ids, author_id').eq('request_id', request).single();
    expect(response).toEqual({ body: 'Here it is.', document_ids: [documentId], author_id: CLAIMANT });
  });

  it('T-US55-1 documents must belong to the claim', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    expect((await respond(claimant, request, 'x', ['00000000-0000-4000-8000-0000000000bb'])).error).not.toBeNull();
    expect(await status(request)).toBe('pending');
  });

  it('T-US55-2 the claimant lawyer may respond; the requester and unrelated users may not', async () => {
    const { lawyer, officer, id } = await lawyerClaim();
    const { data: request } = await create(officer, id, 'legal_representative');
    expect((await respond(officer, request)).error?.code).toBe('42501');
    expect((await respond(await signedIn('lawyer2.demo@example.com'), request)).error?.code).toBe('42501');
    expect((await respond(await signedIn('claimant2.demo@example.com'), request)).error?.code).toBe('42501');
    expect((await respond(lawyer, request)).error).toBeNull();
  });

  it('T-US55-3 a second response needs the officer to ask for more', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    await respond(claimant, request);
    expect((await respond(claimant, request)).error).not.toBeNull();
    expect((await setStatus(officer, request, 'pending')).error).toBeNull();
    expect((await respond(claimant, request, 'More')).error).toBeNull();
  });

  it('T-US57-1 the recipient and the requester are notified, without claim details', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    expect(await notifications(CLAIMANT, id, 'request')).toHaveLength(1);
    await respond(claimant, request);
    const [notice] = await notifications(OFFICER, id, 'response');
    expect(notice!.summary).not.toMatch(/Here it is/);
  });

  it('T-US58-1 status changes keep the request, responses and history', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    await respond(claimant, request);
    expect((await setStatus(officer, request, 'under_review')).error).toBeNull();
    expect((await setStatus(officer, request, 'closed')).error).toBeNull();
    const { data: detail } = await claimant.rpc('get_request_detail', { p_request: request });
    expect(detail.request).toMatchObject({ status: 'closed' });
    expect(detail.request.closed_at).toBeTruthy();
    expect(detail.responses[0]).toMatchObject({ body: 'Here it is.', author_name: 'Thandiwe Mokoena' });
    expect(detail.history.map((row: { to_status: string }) => row.to_status)).toEqual(['responded', 'under_review', 'closed']);
    expect(detail.can_respond).toBe(false);
    expect(detail.can_review).toBe(false);
  });

  it('T-US58-1 only the allowed transitions work', async () => {
    const { claimant, officer, id } = await claimantClaim();
    const { data: request } = await create(officer, id);
    expect((await setStatus(officer, request, 'closed')).error).not.toBeNull();
    await respond(claimant, request);
    expect((await setStatus(officer, request, 'responded')).error).not.toBeNull();
    expect((await setStatus(officer, request, 'closed')).error).toBeNull();
    expect((await setStatus(officer, request, 'pending')).error).not.toBeNull();
  });

  it('T-US58-1 the detail is closed to those without claim access', async () => {
    const { officer, id } = await lawyerClaim();
    const { data: request } = await create(officer, id, 'legal_representative');
    expect((await (await signedIn('claimant2.demo@example.com')).rpc('get_request_detail', { p_request: request })).error?.code).toBe('42501');
    const { data: lawyerView } = await (await signedIn('lawyer.demo@example.com')).rpc('get_request_detail', { p_request: request });
    expect(lawyerView.can_respond).toBe(true);
    expect(lawyerView.can_review).toBe(false);
    expect(LAWYER).toBeTruthy();
  });
});
