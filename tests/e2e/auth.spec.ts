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

for (const [email, route] of [
  ['claimant.demo@example.com', '/dashboard'],
  ['lawyer.demo@example.com', '/lawyer/dashboard'],
  ['officer.demo@example.com', '/raf/dashboard'],
  ['investigator.demo@example.com', '/raf/risk'],
  ['manager.demo@example.com', '/raf/management'],
  ['admin.demo@example.com', '/admin/users'],
] as const) {
  test(`T-US2-1 ${email} lands on ${route}`, async ({ page }) => {
    await signIn(page, email);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  });
}

test('T-US2-3 signing out ends the session and /claims goes to /login', async ({ page }) => {
  await signIn(page, 'claimant.demo@example.com');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'Thandiwe Mokoena' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/claims');
  await expect(page).toHaveURL(/\/login$/);
});

