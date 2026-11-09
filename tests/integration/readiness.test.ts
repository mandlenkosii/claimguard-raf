import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, COMPLETE, createClaim, transition } from './helpers-claims';
import { pdfBytes } from './documentHelpers';
import { addProcessedDocument, ALL_REQUIRED, allIssues, assessments, openIssues } from './readinessHelpers';

const admin = adminClient();
type Client = Awaited<ReturnType<typeof signedIn>>;

const newClaim = async () => {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id } = await createClaim(lawyer, CLIENT_NOMSA, COMPLETE);
  return { lawyer, id };
};
const runChecks = async (client: Client, claimId: string) => {
  const { error } = await client.functions.invoke('run-readiness', { body: { claim_id: claimId } });
  expect(error).toBeNull();
};
const stale = async (id: string) => (await admin.from('claims').select('readiness_stale').eq('id', id).single()).data!.readiness_stale;

describe('run-readiness', () => {
  it('T-US29-1, T-INT-2 and T-BR12-4 writes an assessment, a check per enabled rule and issues, then clears stale', async () => {
    const { lawyer, id } = await newClaim();
    await runChecks(lawyer, id);
    const [assessment] = await assessments(id);
    expect(assessment).toMatchObject({ rules_version: '1.0.0', blocking_count: 4, triggered_by: '00000000-0000-4000-8000-000000000003' });
    const { data: checks } = await admin.from('claim_checks').select('rule_id, rule_version').eq('assessment_id', assessment.id);
    expect([...new Set(checks!.map((check) => check.rule_id))].sort()).toEqual(['RULE-000', 'RULE-001', 'RULE-002', 'RULE-003', 'RULE-004', 'RULE-005']);
    expect(checks!.every((check) => check.rule_version === '1.0.0')).toBe(true);
    expect((await openIssues(id)).map((issue) => issue.issue_key).sort()).toEqual(ALL_REQUIRED.map((key) => `missing:${key}`).sort());
    expect(await stale(id)).toBe(false);
  });

  it('T-US30-2 running twice with the same data gives the same score and hash, and no duplicate issues', async () => {
    const { lawyer, id } = await newClaim();
    await runChecks(lawyer, id);
    await runChecks(lawyer, id);
    const [second, first] = await assessments(id);
    expect(second.input_hash).toBe(first.input_hash);
    expect(second.score).toBe(first.score);
    expect(await openIssues(id)).toHaveLength(4);
  });

  it('T-SEC-13 someone without claim access cannot run checks', async () => {
    const { id } = await newClaim();
    const other = await signedIn('claimant2.demo@example.com');
    const { error } = await other.functions.invoke('run-readiness', { body: { claim_id: id } });
    expect(error).not.toBeNull();
    expect(await assessments(id)).toEqual([]);
  });

  it('T-SEC-13 an anonymous call is rejected', async () => {
    const { id } = await newClaim();
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/run-readiness`, {
      method: 'POST', headers: { 'content-type': 'application/json', apikey: process.env.VITE_SUPABASE_ANON_KEY! }, body: JSON.stringify({ claim_id: id }),
    });
    expect(response.status).toBe(401);
  });

  it('T-US32-1 uploading the missing document recalculates automatically and resolves the issue', async () => {
    const { lawyer, id } = await newClaim();
    await runChecks(lawyer, id);
    await addProcessedDocument(id, 'hospital_medical_report');
    const issues = await allIssues(id);
    expect(issues.find((issue) => issue.issue_key === 'missing:hospital_medical_report')!.status).toBe('resolved');
    expect((await assessments(id)).length).toBe(2);
    const { data: history } = await admin.from('claim_issue_history').select('to_status').eq('issue_id', issues.find((issue) => issue.issue_key === 'missing:hospital_medical_report')!.id);
    expect(history).toEqual([{ to_status: 'resolved' }]);
  });

  it('T-BR10-2 and T-EDGE-7 the same file twice gives a duplicate finding and no fraud label', async () => {
    const { id } = await newClaim();
    const bytes = pdfBytes('same');
    await addProcessedDocument(id, 'identity_document', 'one_SAMPLE.pdf', bytes);
    await addProcessedDocument(id, 'accident_report', 'two_SAMPLE.pdf', bytes);
    const finding = (await openIssues(id)).find((issue) => issue.rule_id === 'RULE-004');
    expect(finding).toBeDefined();
    expect(finding!.issue_key).toMatch(/^duplicate:/);
    expect(JSON.stringify(finding)).not.toMatch(/fraud/i);
  });

  it('T-EDGE-8 the low-confidence fixture gives a RULE-005 issue', async () => {
    const { id } = await newClaim();
    await addProcessedDocument(id, 'identity_document', 'LOW_CONFIDENCE_SAMPLE.pdf');
    expect((await openIssues(id)).some((issue) => issue.rule_id === 'RULE-005')).toBe(true);
  });

  it('T-BR8-2 an identity conflict creates an alert while configured, and only one', async () => {
    const { id } = await newClaim();
    await addProcessedDocument(id, 'identity_document');
    await addProcessedDocument(id, 'hospital_medical_report', 'IDENTITY_CONFLICT_SAMPLE.pdf');
    expect((await openIssues(id)).some((issue) => issue.rule_id === 'RULE-002')).toBe(true);
    const { data: alerts } = await admin.from('risk_alerts').select('indicator_type, severity, status, risk_evidence(id)').eq('claim_id', id);
    expect(alerts).toHaveLength(1);
    expect(alerts![0]).toMatchObject({ indicator_type: 'identity_mismatch', severity: 'MEDIUM', status: 'OPEN' });
    expect((alerts![0] as unknown as { risk_evidence: unknown[] }).risk_evidence.length).toBeGreaterThan(0);
    const { data: claim } = await admin.from('claims').select('status').eq('id', id).single();
    expect(claim).toEqual({ status: 'draft' });
  });

  it('T-BR8-2 no alert is created when the rule is not configured to create one', async () => {
    await admin.from('validation_rules').update({ creates_risk_alert: false }).eq('id', 'RULE-002');
    try {
      const { id } = await newClaim();
      await addProcessedDocument(id, 'identity_document');
      await addProcessedDocument(id, 'hospital_medical_report', 'IDENTITY_CONFLICT_SAMPLE.pdf');
      expect((await openIssues(id)).some((issue) => issue.rule_id === 'RULE-002')).toBe(true);
      expect((await admin.from('risk_alerts').select('id').eq('claim_id', id)).data).toEqual([]);
    } finally {
      await admin.from('validation_rules').update({ creates_risk_alert: true }).eq('id', 'RULE-002');
    }
  });

  it('T-BR13-2, T-US68-2 and T-EDGE-24 Ready needs current checks and no open blocking issues', async () => {
    const { lawyer, id } = await newClaim();
    expect((await transition(lawyer, id, 'documents_needed')).ok).toBe(true);
    for (const category of ALL_REQUIRED) await addProcessedDocument(id, category);
    expect((await transition(lawyer, id, 'validation')).ok).toBe(true);

    await lawyer.from('claims').update({ accident_town: 'Changed town' }).eq('id', id);
    expect(await stale(id)).toBe(true);
    expect(await transition(lawyer, id, 'ready')).toMatchObject({ ok: false, reason: 'Ready — checks must be re-run first' });

    await runChecks(lawyer, id);
    await admin.from('claim_issues').insert({ claim_id: id, rule_id: 'RULE-001', issue_key: 'missing:test', title: 'Missing', explanation: 'Missing', corrective_action: 'Upload', impact: 'blocking', evidence: [] });
    const { data: options } = await lawyer.rpc('allowed_transitions', { p_claim: id });
    expect(options.blocked.map((option: { reason: string }) => option.reason)).toContain('Ready — 1 blocking issue open');
    expect(await transition(lawyer, id, 'ready')).toMatchObject({ ok: false, reason: 'Ready — 1 blocking issue open' });

    await admin.from('claim_issues').update({ status: 'resolved' }).eq('claim_id', id).eq('issue_key', 'missing:test');
    expect(await transition(lawyer, id, 'ready')).toMatchObject({ ok: true, status: 'ready' });
  });
});
