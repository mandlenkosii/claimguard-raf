import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const NOMSA = 'b0000000-0000-4000-8000-000000000003';

async function openNewClaimDocuments(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill('lawyer.demo@example.com');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/lawyer\/dashboard$/);
  const claim = await page.evaluate(
    async ({ url, key, claimant }) => {
      const stored = Object.entries(localStorage).find(([name]) => name.includes('auth-token'));
      const token = JSON.parse(stored![1]).access_token;
      const response = await fetch(`${url}/rest/v1/rpc/create_claim`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_claimant_id: claimant, p_fields: {} }),
      });
      return response.json();
    },
    { url: process.env.VITE_SUPABASE_URL!, key: process.env.VITE_SUPABASE_ANON_KEY!, claimant: NOMSA },
  );
  await page.goto(`/claims/${claim.id}/documents`);
  await page.getByRole('button', { name: 'Upload document' }).first().click();
}

test('T-EDGE-6 an invalid file type is rejected', async ({ page }) => {
  await openNewClaimDocuments(page);
  await page.getByLabel('Browse files').setInputFiles({ name: 'setup.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await expect(page.getByText('File type not supported (.exe)')).toBeVisible();
});

test('T-EDGE-4 a failed document shows Retry and manual review', async ({ page }) => {
  await openNewClaimDocuments(page);
  await page.getByLabel(/Document category/).selectOption('identity_document');
  await page.getByLabel('Browse files').setInputFiles({ name: 'FAILURE_SAMPLE.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 SAMPLE') });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Confirmed ✓')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 40000 });
  await expect(page.getByRole('button', { name: 'Send to manual review' })).toBeVisible();
  await expect(page.getByText("We couldn't read this document. Retry, or send it for manual review.")).toBeVisible();
});

