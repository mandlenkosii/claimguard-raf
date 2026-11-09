import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient, createTestUser, deleteTestUser, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';

const admin = adminClient();
const INVESTIGATOR = '00000000-0000-4000-8000-000000000006';
const SEED_CLAIM_3 = 'c0000000-0000-4000-8000-000000000003';
type Client = Awaited<ReturnType<typeof signedIn>>;
let investigator: Client;
let officer: Client;
let second: { id: string; email: string; password: string };
let secondClient: Client;

beforeAll(async () => {
  investigator = await signedIn('investigator.demo@example.com');
  officer = await signedIn('officer.demo@example.com');
  second = await createTestUser({ first_name: 'Second', surname: 'Investigator', account_type: 'claimant', popia_consent: true });
  await admin.from('user_roles').insert({ user_id: second.id, role_key: 'investigator', assigned_by: '00000000-0000-4000-8000-000000000008', reason: 'Integration test' });
  secondClient = await signedIn(second.email, second.password);
});

afterAll(async () => {
  await admin.from('user_roles').delete().eq('user_id', second.id);
  await admin.from('profiles').update({ account_status: 'disabled' }).eq('id', second.id);
  await deleteTestUser(second.id).catch(() => undefined);
});

async function newAlert(assignedTo: string | null = INVESTIGATOR, status = 'OPEN') {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id: claimId } = await createClaim(lawyer, CLIENT_NOMSA);
  const { data, error } = await admin.from('risk_alerts').insert({ reference: 'RA-2026-00000', claim_id: claimId, rule_id: 'RULE-002', indicator_type: 'identity_mismatch', severity: 'MEDIUM', status, title: 'Test alert', explanation: 'An indicator for review.', assigned_to: assignedTo }).select('id').single();
  if (error) throw new Error(error.message);
  await admin.from('risk_evidence').insert({ alert_id: data.id, claim_field: 'full_name', description: 'Claim record: Name' });
  return { alertId: data.id as string, claimId };
}
const update = (client: Client, alert: string, fields: { assigned?: string; status?: string; severity?: string; reason?: string }) =>
  client.rpc('update_risk_alert', { p_alert: alert, p_assigned_to: fields.assigned ?? null, p_status: fields.status ?? null, p_severity: fields.severity ?? null, p_reason: fields.reason ?? null });
const OUTCOME = { p_outcome: 'extraction_error_corrected', p_finding_summary: 'A typing error.', p_rationale: 'Checked both documents.', p_evidence_ids: [] as string[], p_next_action: 'None', p_next_action_due: null, p_confirmed: true };
const record = (client: Client, alert: string, resulting = 'RESOLVED', overrides: Record<string, unknown> = {}) => client.rpc('record_risk_review', { p_alert: alert, p_resulting_status: resulting, ...OUTCOME, ...overrides });
const alertRow = async (id: string) => (await admin.from('risk_alerts').select('*').eq('id', id).single()).data!;
const claimStatus = async (id: string) => (await admin.from('claims').select('status').eq('id', id).single()).data!.status;

describe('Risk alerts', () => {
  it('T-US39-1 running readiness on seed claim 3 creates the configured alert, once', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    expect((await lawyer.functions.invoke('run-readiness', { body: { claim_id: SEED_CLAIM_3 } })).error).toBeNull();
    expect((await lawyer.functions.invoke('run-readiness', { body: { claim_id: SEED_CLAIM_3 } })).error).toBeNull();
    const { data } = await admin.from('risk_alerts').select('indicator_type, severity, explanation, risk_evidence(id)').eq('claim_id', SEED_CLAIM_3);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ indicator_type: 'identity_mismatch', severity: 'MEDIUM' });
    expect((data![0] as unknown as { risk_evidence: unknown[] }).risk_evidence.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toMatch(/fraud/i);
  });

  it('T-US42-1 an alert moves only through the 8.3 transitions', async () => {
    const { alertId } = await newAlert();
    expect((await update(investigator, alertId, { status: 'RESOLVED' })).error).not.toBeNull();
    expect((await update(investigator, alertId, { status: 'DISMISSED' })).error).not.toBeNull();
    expect((await record(investigator, alertId)).error).not.toBeNull();
    expect((await update(investigator, alertId, { status: 'UNDER_REVIEW' })).error).toBeNull();
    expect((await update(investigator, alertId, { status: 'OPEN' })).error).not.toBeNull();
    expect((await record(investigator, alertId)).error).toBeNull();
    expect((await update(investigator, alertId, { status: 'ESCALATED', reason: 'Too late' })).error).not.toBeNull();
    expect((await alertRow(alertId)).status).toBe('RESOLVED');
  });

  it('T-US43-1 an authorised investigator assigns; an officer is denied', async () => {
    const { alertId } = await newAlert(null);
    expect((await update(officer, alertId, { assigned: INVESTIGATOR })).error?.code).toBe('42501');
    expect((await update(investigator, alertId, { assigned: INVESTIGATOR })).error).toBeNull();
    expect((await alertRow(alertId)).assigned_to).toBe(INVESTIGATOR);
  });

  it('T-US43-1 only an investigator can be assigned', async () => {
    const { alertId } = await newAlert();
    expect((await update(investigator, alertId, { assigned: '00000000-0000-4000-8000-000000000005' })).error).not.toBeNull();
  });

  it('T-US44-1, T-US51-3 and T-BR18-2 stores the outcome, immutably, and leaves the claim alone', async () => {
    const { alertId, claimId } = await newAlert(INVESTIGATOR, 'UNDER_REVIEW');
    const before = await claimStatus(claimId);
    expect((await record(investigator, alertId)).error).toBeNull();
    const { data: review } = await admin.from('risk_reviews').select('*').eq('alert_id', alertId).single();
    expect(review).toMatchObject({ outcome: 'extraction_error_corrected', rationale: 'Checked both documents.', next_action: 'None', recorded_by: INVESTIGATOR });
    expect(review.recorded_at).toBeTruthy();
    expect((await admin.from('risk_reviews').update({ rationale: 'Changed' }).eq('id', review.id)).error).not.toBeNull();
    expect(await claimStatus(claimId)).toBe(before);
  });

  it('T-US51-4 and T-BR18-2 dismissing leaves the claim status unchanged', async () => {
    const { alertId, claimId } = await newAlert(INVESTIGATOR, 'UNDER_REVIEW');
    const before = await claimStatus(claimId);
    expect((await record(investigator, alertId, 'DISMISSED')).error).toBeNull();
    expect((await alertRow(alertId)).status).toBe('DISMISSED');
    expect(await claimStatus(claimId)).toBe(before);
  });

  it('T-US51-1 the confirmation is enforced on the server', async () => {
    const { alertId } = await newAlert(INVESTIGATOR, 'UNDER_REVIEW');
    expect((await record(investigator, alertId, 'RESOLVED', { p_confirmed: false })).error).not.toBeNull();
    expect((await admin.from('risk_reviews').select('id').eq('alert_id', alertId)).data).toEqual([]);
  });

  it('T-US46-1 severity, assignment, status and outcome each write history and audit rows', async () => {
    const { alertId } = await newAlert();
    expect((await update(investigator, alertId, { severity: 'HIGH', reason: 'More serious' })).error).toBeNull();
    expect((await update(investigator, alertId, { assigned: second.id })).error).toBeNull();
    expect((await update(secondClient, alertId, { status: 'UNDER_REVIEW' })).error).toBeNull();
    expect((await record(secondClient, alertId)).error).toBeNull();
    const { data: history } = await admin.from('risk_alert_history').select('change_type, reason').eq('alert_id', alertId).order('created_at');
    expect(history!.map((row) => row.change_type).sort()).toEqual(['assignment', 'outcome', 'severity', 'status', 'status']);
    expect(history!.find((row) => row.change_type === 'severity')!.reason).toBe('More serious');
    const { data: audit } = await admin.from('audit_logs').select('action').eq('resource_id', alertId);
    expect(audit!.filter((row) => row.action === 'ALERT_UPDATED').length).toBeGreaterThanOrEqual(3);
  });

  it('T-US50-1 Escalate needs a reason and is recorded', async () => {
    const { alertId } = await newAlert(INVESTIGATOR, 'UNDER_REVIEW');
    expect((await update(investigator, alertId, { status: 'ESCALATED' })).error).not.toBeNull();
    expect((await update(investigator, alertId, { status: 'ESCALATED', reason: 'Needs a senior' })).error).toBeNull();
    const { data } = await admin.from('risk_alert_history').select('new_value, reason').eq('alert_id', alertId).eq('change_type', 'status');
    expect(data).toEqual([{ new_value: 'ESCALATED', reason: 'Needs a senior' }]);
  });

  it('T-US49-1, T-US49-2 and T-EDGE-19 notes carry author and role, cannot be edited, and corrections keep the original', async () => {
    const { alertId } = await newAlert();
    const { data: note, error } = await investigator.from('investigation_notes').insert({ alert_id: alertId, body: 'First' }).select('id, author_id, created_at').single();
    expect(error).toBeNull();
    expect(note!.author_id).toBe(INVESTIGATOR);
    expect((await admin.from('investigation_notes').update({ body: 'Edited' }).eq('id', note!.id)).error).not.toBeNull();
    expect((await investigator.from('investigation_notes').insert({ alert_id: alertId, body: 'Fixed', corrects_note_id: note!.id })).error).toBeNull();
    const { data: workspace } = await investigator.rpc('get_alert_workspace', { p_alert: alertId });
    expect(workspace.notes.map((item: { body: string }) => item.body)).toEqual(['First', 'Fixed']);
    expect(workspace.notes[0]).toMatchObject({ author_name: 'Ayesha Patel', author_role: 'investigator' });
    expect(workspace.notes[1].corrects_note_id).toBe(note!.id);
  });

  it('T-US41-1 and T-US48-1 the workspace returns rule, evidence, documents, issues and history', async () => {
    const { data } = await investigator.rpc('get_alert_workspace', { p_alert: 'e0000000-0000-4000-8000-000000000001' });
    expect(data.alert.reference).toBe('RA-2026-00031');
    expect(data.rule).toMatchObject({ id: 'RULE-003', version: '1.0.0' });
    expect(data.evidence.map((item: { value: string }) => item.value).sort()).toEqual(['2026-03-12', '2026-03-21']);
    expect(data.evidence[0].filename).toMatch(/SAMPLE/);
    expect(data.documents.length).toBeGreaterThan(0);
    expect(data.issues.some((issue: { rule_id: string }) => issue.rule_id === 'RULE-003')).toBe(true);
  });

  it('T-US47-1 the queue lists only authorised alerts and severity counts', async () => {
    const assigned = await newAlert(second.id);
    const mine = await investigator.rpc('risk_queue', { p_tab: 'all' });
    expect(mine.error).toBeNull();
    expect(mine.data.rows.map((row: { id: string }) => row.id)).not.toContain(assigned.alertId);
    const theirs = await secondClient.rpc('risk_queue', { p_tab: 'assigned' });
    expect(theirs.data.rows.map((row: { id: string }) => row.id)).toEqual([assigned.alertId]);
    expect(theirs.data.counts).toMatchObject({ MEDIUM: 1, HIGH: 0 });
  });

  it('T-US47-1 unassigned alerts are listed without their evidence until assigned', async () => {
    const { alertId } = await newAlert(null);
    const queue = await investigator.rpc('risk_queue', { p_tab: 'unassigned', p_page_size: 200 });
    expect(queue.data.rows.find((row: { id: string }) => row.id === alertId)).toMatchObject({ can_open: false });
    expect((await investigator.rpc('get_alert_workspace', { p_alert: alertId })).error?.code).toBe('42501');
    expect((await investigator.from('risk_evidence').select('id').eq('alert_id', alertId)).data).toEqual([]);
  });

  it('T-US47-1 filters narrow the queue', async () => {
    await newAlert(second.id);
    const none = await secondClient.rpc('risk_queue', { p_tab: 'assigned', p_severity: 'CRITICAL' });
    expect(none.data.rows).toEqual([]);
    const some = await secondClient.rpc('risk_queue', { p_tab: 'assigned', p_severity: 'MEDIUM', p_indicator: 'identity_mismatch', p_status: 'OPEN', p_assignee: second.id });
    expect(some.data.rows.length).toBeGreaterThan(0);
    const old = await secondClient.rpc('risk_queue', { p_tab: 'assigned', p_min_age: 30 });
    expect(old.data.rows).toEqual([]);
  });

  it.each(['officer.demo@example.com', 'manager.demo@example.com', 'lawyer.demo@example.com', 'claimant.demo@example.com'])('T-US52-1 %s cannot open the queue or the workspace', async (email) => {
    const client = await signedIn(email);
    expect((await client.rpc('risk_queue', { p_tab: 'all' })).error?.code).toBe('42501');
    expect((await client.rpc('get_alert_workspace', { p_alert: 'e0000000-0000-4000-8000-000000000001' })).error?.code).toBe('42501');
  });
});
