import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';

test('T-E2E-5 an invalid transition sent to the server is rejected', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill('claimant.demo@example.com');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const result = await page.evaluate(
    async ({ url, key }) => {
      const stored = Object.entries(localStorage).find(([name]) => name.includes('auth-token'));
      const token = JSON.parse(stored![1]).access_token;
      const response = await fetch(`${url}/rest/v1/rpc/transition_claim_status`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_claim: 'c0000000-0000-4000-8000-000000000002', p_target: 'settlement', p_reason: 'E2E test' }),
      });
      return response.json();
    },
    { url: process.env.VITE_SUPABASE_URL!, key: process.env.VITE_SUPABASE_ANON_KEY! },
  );
  expect(result.ok).toBe(false);
});
