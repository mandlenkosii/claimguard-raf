import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const COMPLETE = { claimant_role: 'driver', accident_date: '2026-01-15', accident_province: 'Gauteng', accident_description: 'Fictional E2E accident.' };

test('T-E2E-1 create a claim, run checks, upload a document and see its issue resolved', async ({ page }) => {
  test.setTimeout(120000);
  const lawyer = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await lawyer.auth.signInWithPassword({ email: 'lawyer.demo@example.com', password });
  const { data: claim } = await lawyer.rpc('create_claim', { p_claimant_id: 'b0000000-0000-4000-8000-000000000003', p_fields: COMPLETE });

  await page.goto('/login');
  await page.getByLabel(/Email/).fill('lawyer.demo@example.com');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/lawyer\/dashboard$/);

  await page.goto(`/claims/${claim.id}/readiness`);
  await page.getByRole('button', { name: 'Run checks' }).click();
  const blocking = page.getByTestId('group-blocking');
  await expect(blocking.getByRole('heading', { name: 'Identity document missing' })).toBeVisible({ timeout: 30000 });

  await page.getByRole('tab', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'Upload document' }).click();
  await page.getByLabel(/Document category/).selectOption('identity_document');
  await page.getByLabel('Browse files').setInputFiles({ name: 'identity_SAMPLE.pdf', mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 SAMPLE ${Date.now()}`) });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Confirmed ✓')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('table').getByText('Processed', { exact: true })).toBeVisible({ timeout: 40000 });

  await page.getByRole('tab', { name: 'Readiness' }).click();
  await expect(page.getByTestId('group-resolved').getByRole('heading', { name: 'Identity document missing' })).toBeVisible({ timeout: 40000 });
});

