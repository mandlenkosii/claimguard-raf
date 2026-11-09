import { describe, expect, it } from 'vitest';
import { signedIn } from './helpers';

const within2s = async (work: () => PromiseLike<{ error: unknown }>) => {
  const started = Date.now();
  const { error } = await work();
  expect(error).toBeNull();
  expect(Date.now() - started).toBeLessThan(2000);
};

describe('T-NFR-2 common operations', () => {
  it('OP11 the claims list', async () => {
    const client = await signedIn('lawyer.demo@example.com');
    await within2s(() => client.from('claims_list').select('*', { count: 'exact' }).range(0, 19));
  });

  it('OP12 a claim', async () => {
    const client = await signedIn('lawyer.demo@example.com');
    await within2s(() => client.from('claims_list').select('*').eq('id', 'c0000000-0000-4000-8000-000000000003').maybeSingle());
  });

  it('OP26 readiness', async () => {
    const client = await signedIn('lawyer.demo@example.com');
    await within2s(() => client.from('readiness_assessments').select('*').eq('claim_id', 'c0000000-0000-4000-8000-000000000003').order('assessed_at', { ascending: false }).limit(1));
  });

  it('OP27 the risk queue', async () => {
    const client = await signedIn('investigator.demo@example.com');
    await within2s(() => client.rpc('risk_queue', { p_tab: 'all' }));
  });

  it('OP39 dashboard metrics', async () => {
    const client = await signedIn('manager.demo@example.com');
    await within2s(() => client.rpc('get_dashboard_metrics', { p_role: 'manager' }));
  });
});
