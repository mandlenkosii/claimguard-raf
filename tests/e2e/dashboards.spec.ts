import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

const ROLES = [
  ['claimant.demo@example.com', /\/dashboard$/, 'Hello, Thandiwe'],
  ['lawyer.demo@example.com', /\/lawyer\/dashboard$/, 'Dashboard'],
  ['officer.demo@example.com', /\/raf\/dashboard$/, 'Dashboard'],
  ['investigator.demo@example.com', /\/raf\/risk$/, 'Risk queue'],
  ['manager.demo@example.com', /\/raf\/management$/, 'Management dashboard'],
] as const;

for (const [email, url, heading] of ROLES) {
  test(`T-US74-1 and T-E2E-6 ${email} lands on their dashboard and can view a claim`, async ({ page }) => {
    await signIn(page, email);
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    const claim = email.startsWith('claimant') ? 'c0000000-0000-4000-8000-000000000002' : email.startsWith('investigator') ? 'c0000000-0000-4000-8000-000000000005' : 'c0000000-0000-4000-8000-000000000003';
    await page.goto(`/claims/${claim}`);
    await expect(page.getByText(/CG-2026-00014\d/).first()).toBeVisible();
  });
}

test('T-US74-1 the administrator lands on user administration', async ({ page }) => {
  await signIn(page, 'admin.demo@example.com');
  await expect(page).toHaveURL(/\/admin\/users$/);
});

test('T-US71-1 the notifications page opens from the bell', async ({ page }) => {
  await signIn(page, 'officer.demo@example.com');
  await expect(page).toHaveURL(/\/raf\/dashboard$/);
  await page.getByRole('link', { name: /^Notifications/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Claim updates' })).toBeVisible();
});

