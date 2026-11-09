import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const SEED_ALERT = 'e0000000-0000-4000-8000-000000000001';
const INVESTIGATOR = '00000000-0000-4000-8000-000000000006';
const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function newAlert() {
  const lawyer = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
  await lawyer.auth.signInWithPassword({ email: 'lawyer.demo@example.com', password });
  const { data: claim } = await lawyer.rpc('create_claim', { p_claimant_id: 'b0000000-0000-4000-8000-000000000003', p_fields: {} });
  const { data: alert } = await admin.from('risk_alerts').insert({ reference: 'RA-2026-00000', claim_id: claim.id, rule_id: 'RULE-002', indicator_type: 'identity_mismatch', severity: 'MEDIUM', status: 'UNDER_REVIEW', title: 'E2E identity conflict', explanation: 'An indicator for review.', assigned_to: INVESTIGATOR }).select('id').single();
  await admin.from('risk_evidence').insert([{ alert_id: alert!.id, claim_field: 'full_name', description: 'Claim record: Name A' }, { alert_id: alert!.id, claim_field: 'full_name', description: 'Identity document: Name B' }]);
  return { claimId: claim.id as string, alertId: alert!.id as string };
}

test('T-US48-2 clicking evidence opens the source document at the referenced field', async ({ page }) => {
  await signIn(page, 'investigator.demo@example.com');
  await page.goto(`/raf/risk/${SEED_ALERT}`);
  await page.getByRole('button', { name: /Hospital medical report: 2026-03-21/ }).click();
  const preview = page.getByTestId('document-preview');
  await expect(preview.getByText('hospital_medical_report_SAMPLE.pdf')).toBeVisible();
  await expect(preview.getByText('Admission date · Page 1')).toBeVisible();
  await expect(preview.getByText('SAMPLE', { exact: true })).toBeVisible();
});

test('T-E2E-2 and T-EDGE-13 an investigator reviews an inconsistency, and closing it leaves the claim status unchanged', async ({ page }) => {
  const { claimId, alertId } = await newAlert();
  const statusBefore = (await admin.from('claims').select('status').eq('id', claimId).single()).data!.status;

  await signIn(page, 'investigator.demo@example.com');
  await expect(page).toHaveURL(/\/raf\/risk$/);
  await page.goto(`/raf/risk/${alertId}`);
  await expect(page.getByRole('heading', { name: 'Why this alert was raised' })).toBeVisible();
  await page.getByLabel(/Add a note/).fill('Reviewed both sources.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Reviewed both sources.')).toBeVisible();

  await page.getByRole('button', { name: 'Record outcome' }).click();
  await page.getByLabel('No issue / explained').check();
  await page.getByLabel(/Finding summary/).fill('The names refer to one person.');
  await page.getByLabel(/Rationale/).fill('Compared the sources.');
  await page.getByLabel(/^Next action/).first().fill('None');
  await page.getByLabel('I confirm this outcome is based on my own review of the evidence.').check();
  await page.getByRole('button', { name: 'Save outcome' }).click();
  await expect(page.getByText('The names refer to one person.')).toBeVisible();

  await expect.poll(async () => (await admin.from('risk_alerts').select('status').eq('id', alertId).single()).data!.status).toBe('RESOLVED');
  expect((await admin.from('claims').select('status').eq('id', claimId).single()).data!.status).toBe(statusBefore);
});

test('T-US52-1 the officer sees only the neutral flag on the Risk tab', async ({ page }) => {
  await signIn(page, 'officer.demo@example.com');
  await page.goto('/claims/c0000000-0000-4000-8000-000000000005/risk');
  await expect(page.getByText('Under review')).toBeVisible();
  await expect(page.getByText('Conflicting accident dates across documents')).toHaveCount(0);
});

test('T-EDGE-22 the manager is denied the investigation workspace', async ({ page }) => {
  await signIn(page, 'manager.demo@example.com');
  await page.goto(`/raf/risk/${SEED_ALERT}`);
  await expect(page.getByRole('heading', { name: /access/i })).toBeVisible();
  await expect(page.getByText('Why this alert was raised')).toHaveCount(0);
});

