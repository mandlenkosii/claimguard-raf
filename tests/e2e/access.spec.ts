import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';
const SIPHO_CLAIM = 'c0000000-0000-4000-8000-000000000003';
const THANDIWE_CLAIM = 'c0000000-0000-4000-8000-000000000002';
const SECOND_FIRM_CLAIM = 'c0000000-0000-4000-8000-000000000004';
const DENIED = "You don't have permission to view this claim";

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('T-EDGE-1 and T-E2E-4 a claimant changing the claim id in the URL sees S25 and no claim data', async ({ page }) => {
  await signIn(page, 'claimant.demo@example.com');
  await page.goto(`/claims/${SIPHO_CLAIM}`);
  await expect(page.getByText(DENIED)).toBeVisible();
  await expect(page.getByText('Sipho Ndlovu')).toHaveCount(0);
  await expect(page.getByText('CG-2026-000142')).toHaveCount(0);
});

test('T-EDGE-20 a lawyer opening the second firm\'s claim by URL is denied', async ({ page }) => {
  await signIn(page, 'lawyer.demo@example.com');
  await page.goto(`/claims/${SECOND_FIRM_CLAIM}`);
  await expect(page.getByText(DENIED)).toBeVisible();
});

test('T-EDGE-20 a lawyer opening the second firm\'s client by URL is denied', async ({ page }) => {
  await signIn(page, 'lawyer.demo@example.com');
  await page.goto('/lawyer/clients/b0000000-0000-4000-8000-000000000004');
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
});

test('T-E2E-7 a manager sees the restricted summary view with no Risk or Audit tabs', async ({ page }) => {
  await signIn(page, 'manager.demo@example.com');
  await page.goto(`/claims/${SIPHO_CLAIM}`);
  await expect(page.getByText('CG-2026-000142')).toBeVisible();
  await expect(page.getByText('Sipho Ndlovu')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Risk/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Audit/ })).toHaveCount(0);
});

test('T-US11-2 a claimant has no Risk or Audit tab on their own claim', async ({ page }) => {
  await signIn(page, 'claimant.demo@example.com');
  await page.goto(`/claims/${THANDIWE_CLAIM}`);
  await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Risk/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /Audit/ })).toHaveCount(0);
});
