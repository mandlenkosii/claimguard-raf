import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';

const ROLES = [
  ['claimant.demo@example.com', /\/dashboard$/],
  ['lawyer.demo@example.com', /\/lawyer\/dashboard$/],
  ['officer.demo@example.com', /\/raf\/dashboard$/],
  ['investigator.demo@example.com', /\/raf\/risk$/],
  ['manager.demo@example.com', /\/raf\/management$/],
  ['admin.demo@example.com', /\/admin\/users$/],
] as const;

for (const [email, landing] of ROLES) {
  test(`T-REL-2 ${email} signs in and sees their dashboard, and a deep link survives a reload`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(landing);
    await expect(page.getByText(/Concept Prototype/).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(landing);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
}

test('T-REL-2 the demo sign-in buttons work', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('demo-role').first().click();
  await expect(page).not.toHaveURL(/\/login$/);
});
