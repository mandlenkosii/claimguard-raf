import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';

const admin = adminClient();
const OFFICER = '00000000-0000-4000-8000-000000000005';
const SEED_THREAD = 'f0000000-0000-4000-8000-000000000001';
const SEED_CLAIM = 'c0000000-0000-4000-8000-000000000003';

async function conversation() {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id: claimId } = await createClaim(lawyer, CLIENT_NOMSA);
  await admin.from('claim_assignments').insert({ claim_id: claimId, profile_id: OFFICER, assignment_role: 'raf_officer', assigned_by: '00000000-0000-4000-8000-000000000008' });
  const { data: thread, error } = await lawyer.from('message_threads').insert({ claim_id: claimId, title: 'Question' }).select('id').single();
  if (error) throw new Error(error.message);
  const { data: message } = await lawyer.from('messages').insert({ thread_id: thread.id, claim_id: claimId, body: 'Hello' }).select('id').single();
  return { lawyer, claimId, threadId: thread.id as string, messageId: message!.id as string };
}

describe('Messaging', () => {
  it('T-US62-1 another claimant gets nothing for this claim', async () => {
    const other = await signedIn('claimant.demo@example.com');
    expect((await other.from('message_threads').select('id').eq('id', SEED_THREAD)).data).toEqual([]);
    expect((await other.from('messages').select('id').eq('thread_id', SEED_THREAD)).data).toEqual([]);
    const { data: messaging } = await other.rpc('get_claim_messaging', { p_claim: SEED_CLAIM });
    expect(messaging).toEqual({ is_participant: false, threads: [], participants: [] });
    expect((await other.rpc('get_thread_messages', { p_thread: SEED_THREAD })).data).toEqual([]);
  });

  it('T-US59-1 and T-US60-1 participants see the thread, with author, role and time', async () => {
    const { lawyer, claimId, threadId } = await conversation();
    const { data } = await lawyer.rpc('get_claim_messaging', { p_claim: claimId });
    expect(data.is_participant).toBe(true);
    expect(data.threads).toEqual([expect.objectContaining({ id: threadId, title: 'Question', last_message_body: 'Hello' })]);
    expect(data.participants.map((item: { role: string }) => item.role).sort()).toEqual(['lawyer', 'raf_officer']);
    const officer = await signedIn('officer.demo@example.com');
    const { data: messages } = await officer.rpc('get_thread_messages', { p_thread: threadId });
    expect(messages[0]).toMatchObject({ body: 'Hello', author_name: 'Lindiwe Nkosi', author_role: 'lawyer' });
    expect(messages[0].created_at).toBeTruthy();
  });

  it('T-BR21-1 nobody can post as someone else', async () => {
    const { lawyer, claimId, threadId } = await conversation();
    expect((await lawyer.from('messages').insert({ thread_id: threadId, claim_id: claimId, body: 'Fake', author_id: OFFICER })).error).not.toBeNull();
  });

  it('T-US63-1 the other participants are notified, without the message text', async () => {
    const { claimId } = await conversation();
    const { data } = await admin.from('notifications').select('summary, link').eq('recipient_id', OFFICER).eq('claim_id', claimId).eq('type', 'message');
    expect(data).toHaveLength(1);
    expect(data![0]!.summary).not.toMatch(/Hello/);
    expect(data![0]!.link).toBe(`/claims/${claimId}/messages`);
  });

  it('T-US64-1 a message is audited and cannot be edited or deleted', async () => {
    const { lawyer, messageId } = await conversation();
    const { data: audit } = await admin.from('audit_logs').select('action').eq('resource_id', messageId);
    expect(audit).toEqual([{ action: 'MESSAGE_POSTED' }]);
    expect((await lawyer.from('messages').update({ body: 'Changed' }).eq('id', messageId)).error).not.toBeNull();
    expect((await lawyer.from('messages').delete().eq('id', messageId)).error).not.toBeNull();
    expect((await admin.from('messages').select('body').eq('id', messageId).single()).data).toEqual({ body: 'Hello' });
  });
});
