import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';

const admin = adminClient();
const metrics = async (email: string, role: string) => {
  const client = await signedIn(email);
  const { data, error } = await client.rpc('get_dashboard_metrics', { p_role: role });
  expect(error).toBeNull();
  return data;
};
const count = async (query: PromiseLike<{ count: number | null }>) => (await query).count;

describe('Dashboards', () => {
  it('T-US75-1 the manager counts equal direct counts', async () => {
    const data = await metrics('manager.demo@example.com', 'manager');
    expect(data.claims_total).toBe(await count(admin.from('claims').select('id', { count: 'exact', head: true })));
    expect(data.ready_claims).toBe(await count(admin.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'ready')));
    expect(data.blocking_issues).toBe(await count(admin.from('claim_issues').select('id', { count: 'exact', head: true }).eq('impact', 'blocking').in('status', ['open', 'under_review'])));
    expect(data.open_requests).toBe(await count(admin.from('information_requests').select('id', { count: 'exact', head: true }).neq('status', 'closed')));
    expect(data.open_alerts).toBe(await count(admin.from('risk_alerts').select('id', { count: 'exact', head: true }).in('status', ['OPEN', 'UNDER_REVIEW', 'ESCALATED'])));
    const byStatus = Object.values(data.by_status as Record<string, number>).reduce((sum, value) => sum + value, 0);
    expect(byStatus).toBe(data.claims_total);
  });

  it('T-US79-1 the manager metrics hold no claimant names or evidence', async () => {
    const text = JSON.stringify(await metrics('manager.demo@example.com', 'manager'));
    expect(text).not.toMatch(/Ndlovu|Molefe|Khumalo|Mokoena|Merwe/);
  });

  it('T-US75-1 and T-US79-1 the lawyer counts are firm scope only', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { count: total } = await lawyer.from('claims').select('id', { count: 'exact', head: true });
    const data = await metrics('lawyer.demo@example.com', 'lawyer');
    expect(data.claims_total).toBe(total);
    const other = await metrics('lawyer2.demo@example.com', 'lawyer');
    expect(other.claims_total).toBeLessThan(data.claims_total);
  });

  it('T-US75-1 the officer counts are the assigned claims', async () => {
    const data = await metrics('officer.demo@example.com', 'raf_officer');
    expect(data.claims_total).toBe(await count(admin.from('claim_assignments').select('claim_id', { count: 'exact', head: true }).eq('profile_id', '00000000-0000-4000-8000-000000000005').eq('assignment_role', 'raf_officer').is('ended_at', null)));
  });

  it('T-US80-2 a new claim raises the count by one', async () => {
    const before = (await metrics('lawyer.demo@example.com', 'lawyer')).claims_total;
    await createClaim(await signedIn('lawyer.demo@example.com'), CLIENT_NOMSA);
    expect((await metrics('lawyer.demo@example.com', 'lawyer')).claims_total).toBe(before + 1);
  });

  it('T-US76-1 outstanding work lists open requests and unresolved issues in scope', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { id } = await createClaim(lawyer, CLIENT_NOMSA);
    await admin.from('claim_issues').insert({ claim_id: id, rule_id: 'RULE-001', issue_key: 'missing:work', title: 'Work issue', explanation: 'E', corrective_action: 'C', impact: 'blocking', evidence: [] });
    const { data } = await lawyer.rpc('get_outstanding_work', { p_role: 'lawyer' });
    expect(data.find((item: { claim_id: string }) => item.claim_id === id)).toMatchObject({ kind: 'issue', title: 'Work issue', column: 'todo', claimant_name: 'Nomsa Khumalo' });
    const other = await signedIn('lawyer2.demo@example.com');
    const { data: theirs } = await other.rpc('get_outstanding_work', { p_role: 'lawyer' });
    expect(theirs.some((item: { claim_id: string }) => item.claim_id === id)).toBe(false);
  });

  it('T-S9-1 the claimant home holds their own latest claim', async () => {
    const claimant = await signedIn('claimant2.demo@example.com');
    const { data, error } = await claimant.rpc('get_claimant_home');
    expect(error).toBeNull();
    expect(data.claim.reference).toBe('CG-2026-000142');
    expect(data.recent_messages[0].author_name).toBeTruthy();
  });

  it.each([['claimant.demo@example.com', 'manager'], ['lawyer.demo@example.com', 'raf_officer'], ['admin.demo@example.com', 'manager']])('T-US79-1 %s asking for %s metrics gets nothing', async (email, role) => {
    expect(await metrics(email, role)).toEqual({});
  });
});
