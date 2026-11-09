import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const password = process.env.DEMO_USER_PASSWORD ?? '';

test('T-E2E-8 a meaningful action appears in the audit log', async ({ page }) => {
  const name = `E2E Firm ${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel(/Email/).fill('admin.demo@example.com');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByText('Administrative access does not grant access to claim content.')).toBeVisible();

  await page.goto('/admin/organisations');
  await page.getByRole('button', { name: 'Add organisation' }).click();
  await page.getByLabel(/^Name/).fill(name);
  await page.getByLabel(/^Type/).selectOption('law_firm');
  await page.getByRole('button', { name: 'Save organisation' }).click();
  await expect(page.getByText(name)).toBeVisible();

  await page.goto('/admin/audit');
  await page.getByLabel('Category').selectOption('configuration');
  await expect(page.getByRole('cell', { name: 'ORGANISATION_CREATED' }).first()).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();
});

test('T-S40-1 the roles page shows the permission matrix', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill('admin.demo@example.com');
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.goto('/admin/roles');
  await expect(page.getByRole('row', { name: /View claims/ })).toBeVisible();
  await expect(page.getByText('Permissions are enforced on the server and database, not only in the interface.')).toBeVisible();
});

