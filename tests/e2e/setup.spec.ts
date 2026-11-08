import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const NOTICE = 'ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.';

test('T-SETUP-5 the landing page shows the prototype notice', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(NOTICE)).toBeVisible();
});

test('T-SETUP-5 the landing page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => v.id)).toEqual([]);
});
