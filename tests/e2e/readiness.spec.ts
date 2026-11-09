import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const NOMSA = 'b0000000-0000-4000-8000-000000000003';
const options = { auth: { persistSession: false, autoRefreshToken: false } };

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('T-EDGE-10 a high score with a blocking issue shows the blocking issue and that Ready is blocked', async ({ page }) => {
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const lawyer = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
  await lawyer.auth.signInWithPassword({ email: 'lawyer.demo@example.com', password });
  const { data: claim } = await lawyer.rpc('create_claim', { p_claimant_id: NOMSA, p_fields: {} });
  await admin.from('readiness_assessments').insert({ claim_id: claim.id, rules_version: '1.0.0', input_hash: 'e2e', score: 93, category_scores: { documentation: 75, required_information: 100, identity: 100, timeline: 100, cross_document: 100 }, blocking_count: 1, warning_count: 0, resolved_count: 0 });
  await admin.from('claim_issues').insert({ claim_id: claim.id, rule_id: 'RULE-001', issue_key: 'missing:hospital_medical_report', title: 'Hospital medical report missing', explanation: 'A required document category has not been supplied.', corrective_action: 'Request or upload the document.', impact: 'blocking', evidence: [{ source: 'Hospital medical report', field: 'category' }] });

  await signIn(page, 'lawyer.demo@example.com');
  await page.goto(`/claims/${claim.id}/readiness`);
  await expect(page.getByRole('img', { name: 'Readiness 93%' }).last()).toBeVisible();
  await expect(page.getByText('1 blocking issue — this claim cannot move to Ready until it is resolved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hospital medical report missing' })).toBeVisible();
});

test('T-EDGE-18 a user marks a discrepancy as an extraction error or a genuine discrepancy', async ({ page }) => {
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const lawyer = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
  await lawyer.auth.signInWithPassword({ email: 'lawyer.demo@example.com', password });
  const { data: claim } = await lawyer.rpc('create_claim', { p_claimant_id: NOMSA, p_fields: {} });
  await admin.from('readiness_assessments').insert({ claim_id: claim.id, rules_version: '1.0.0', input_hash: 'e2e', score: 85, category_scores: { documentation: 100, required_information: 100, identity: 0, timeline: 100, cross_document: 100 }, blocking_count: 0, warning_count: 1, resolved_count: 0 });
  const { data: issue } = await admin.from('claim_issues').insert({ claim_id: claim.id, rule_id: 'RULE-002', issue_key: 'conflict:full_name', title: 'Claimant name differs between documents', explanation: 'Differs', corrective_action: 'Review', impact: 'warning', evidence: [{ source: 'Identity document', field: 'full_name', value: 'Name A' }, { source: 'Hospital medical report', field: 'full_name', value: 'Name B' }] }).select('id').single();

  await signIn(page, 'lawyer.demo@example.com');
  await page.goto(`/claims/${claim.id}/readiness`);
  await page.getByRole('button', { name: 'This is an extraction error' }).click();
  await expect.poll(async () => (await admin.from('claim_issues').select('classification').eq('id', issue!.id).single()).data!.classification).toBe('extraction_error');
  await page.getByRole('button', { name: 'Mark as genuine discrepancy' }).click();
  await expect.poll(async () => (await admin.from('claim_issues').select('classification').eq('id', issue!.id).single()).data!.classification).toBe('genuine_discrepancy');
});
