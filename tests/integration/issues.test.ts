import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';

const admin = adminClient();

async function issueOnNewClaim() {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id } = await createClaim(lawyer, CLIENT_NOMSA);
  const { data } = await admin.from('claim_issues').insert({ claim_id: id, rule_id: 'RULE-002', issue_key: `conflict:${Date.now()}`, title: 'Conflict', explanation: 'Differs', corrective_action: 'Review', impact: 'warning', evidence: [{ source: 'A' }] }).select('id').single();
  return { lawyer, issueId: data!.id as string, claimId: id };
}
const update = (client: Awaited<ReturnType<typeof signedIn>>, issue: string, status: string | null, reason: string | null = null, classification: string | null = null) =>
  client.rpc('update_issue_status', { p_issue: issue, p_status: status, p_reason: reason, p_classification: classification });

describe('update_issue_status', () => {
  it('T-US35-2 stores the classification without changing the status', async () => {
    const { lawyer, issueId } = await issueOnNewClaim();
    expect((await update(lawyer, issueId, null, null, 'extraction_error')).error).toBeNull();
    const { data } = await admin.from('claim_issues').select('classification, status').eq('id', issueId).single();
    expect(data).toEqual({ classification: 'extraction_error', status: 'open' });
  });

  it('T-US37-1 and T-US37-2 moves through under review to resolved, and keeps its history', async () => {
    const { lawyer, issueId } = await issueOnNewClaim();
    expect((await update(lawyer, issueId, 'under_review')).error).toBeNull();
    expect((await update(lawyer, issueId, 'resolved')).error).toBeNull();
    const { data: issue } = await lawyer.from('claim_issues').select('status, updated_by').eq('id', issueId).single();
    expect(issue).toEqual({ status: 'resolved', updated_by: '00000000-0000-4000-8000-000000000003' });
    const { data: history } = await lawyer.from('claim_issue_history').select('from_status, to_status').eq('issue_id', issueId).order('created_at');
    expect(history).toEqual([{ from_status: 'open', to_status: 'under_review' }, { from_status: 'under_review', to_status: 'resolved' }]);
  });

  it('T-US37-1 dismissing needs a reason', async () => {
    const { lawyer, issueId } = await issueOnNewClaim();
    expect((await update(lawyer, issueId, 'dismissed')).error).not.toBeNull();
    expect((await update(lawyer, issueId, 'dismissed', 'Expected')).error).toBeNull();
    const { data } = await admin.from('claim_issues').select('status, dismiss_reason').eq('id', issueId).single();
    expect(data).toEqual({ status: 'dismissed', dismiss_reason: 'Expected' });
  });

  it('T-US37-1 a closed issue cannot change again', async () => {
    const { lawyer, issueId } = await issueOnNewClaim();
    await update(lawyer, issueId, 'resolved');
    expect((await update(lawyer, issueId, 'open')).error).not.toBeNull();
  });

  it.each(['claimant2.demo@example.com', 'lawyer2.demo@example.com', 'manager.demo@example.com'])('T-SEC-13 %s cannot change the issue', async (email) => {
    const { issueId } = await issueOnNewClaim();
    const other = await signedIn(email);
    expect((await update(other, issueId, 'resolved')).error?.code).toBe('42501');
  });
});
