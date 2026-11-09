import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function signOut(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => window.localStorage.clear());
}

async function claimantClaim() {
  const claimant = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
  await claimant.auth.signInWithPassword({ email: 'claimant.demo@example.com', password });
  const { data: claim } = await claimant.rpc('create_claim', { p_claimant_id: null, p_fields: {} });
  await admin.from('claim_assignments').insert({ claim_id: claim.id, profile_id: '00000000-0000-4000-8000-000000000005', assignment_role: 'raf_officer', assigned_by: '00000000-0000-4000-8000-000000000008' });
  return claim.id as string;
}

test('T-E2E-3 and T-EDGE-12 request information, respond, and close only after review', async ({ page }) => {
  test.setTimeout(90000);
  const claimId = await claimantClaim();

  await signIn(page, 'officer.demo@example.com');
  await page.goto(`/claims/${claimId}/requests`);
  await page.getByRole('button', { name: 'New request' }).click();
  await page.getByLabel(/Request title/).fill('Provide hospital report');
  await page.getByLabel(/Description/).fill('Please provide the report.');
  await page.getByLabel(/Recipient/).selectOption('claimant');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('link', { name: 'Provide hospital report', exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, 'claimant.demo@example.com');
  await page.goto(`/claims/${claimId}/requests`);
  await page.getByRole('link', { name: 'Provide hospital report', exact: true }).click();
  await page.getByLabel(/Your response/).fill('Here is what you asked for.');
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect.poll(async () => (await admin.from('information_requests').select('status').eq('claim_id', claimId).single()).data!.status).toBe('responded');
  await expect(page.getByLabel(/Your response/)).toHaveCount(0);
  const row = await admin.from('information_requests').select('id').eq('claim_id', claimId).single();
  await signOut(page);

  await signIn(page, 'officer.demo@example.com');
  await page.goto(`/claims/${claimId}/requests/${row.data!.id}`);
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByRole('button', { name: 'Start review' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close request' }).click();
  await expect.poll(async () => (await admin.from('information_requests').select('status').eq('id', row.data!.id).single()).data!.status).toBe('closed');
});

test('T-US59-1 a message appears in the claim thread', async ({ page }) => {
  await signIn(page, 'lawyer.demo@example.com');
  await page.goto('/claims/c0000000-0000-4000-8000-000000000003/messages');
  await expect(page.getByText('Please confirm the spelling of the claimant name on the hospital medical report.').last()).toBeVisible();
  const text = `E2E message ${Date.now()}`;
  await page.getByRole('textbox', { name: /^Message/ }).fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(text).first()).toBeVisible();
});

