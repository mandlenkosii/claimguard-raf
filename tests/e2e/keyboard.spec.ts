import { expect, test } from '@playwright/test';
import { SEED, useSession } from './session';

test('T-NFR-8 signing in works from the keyboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Email/).focus();
  await page.keyboard.type('nobody@example.com');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/^Password/)).toBeFocused();
});

test('T-NFR-8 focus is visible on controls', async ({ page }) => {
  await useSession(page, 'lawyer.demo@example.com');
  await page.goto('/lawyer/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const link = page.getByRole('link', { name: 'Tasks' }).first();
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  const shadow = await link.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(shadow).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lawyer\/tasks$/);
});

test('T-NFR-8 and T-NAV-7 Escape closes M2 and leaves the page underneath', async ({ page }) => {
  await useSession(page, 'lawyer.demo@example.com');
  await page.goto(`/claims/${SEED.sipho}`);
  const button = page.getByRole('button', { name: 'Change status' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/claims/${SEED.sipho}$`));
});

test('T-NAV-7 Cancel and the close icon close M1', async ({ page }) => {
  await useSession(page, 'claimant.demo@example.com');
  await page.goto(`/claims/${SEED.thandiwe}/documents`);
  await page.getByRole('button', { name: 'Upload document' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Upload document' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
