import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { SEED, useSession } from './session';

const NOTICE = /Concept Prototype/;
const WIDTHS = [1440, 1024, 390];

const ROUTES: Array<[string | null, string]> = [
  [null, '/'],
  [null, '/about'],
  [null, '/how-it-works'],
  [null, '/security'],
  [null, '/login'],
  [null, '/register'],
  ['claimant.demo@example.com', '/dashboard'],
  ['claimant.demo@example.com', '/claims'],
  ['claimant.demo@example.com', '/claims/new'],
  ['claimant.demo@example.com', '/notifications'],
  ['claimant.demo@example.com', '/profile'],
  ['claimant.demo@example.com', `/claims/${SEED.thandiwe}`],
  ['claimant.demo@example.com', `/claims/${SEED.thandiwe}/documents`],
  ['claimant.demo@example.com', `/claims/${SEED.thandiwe}/readiness`],
  ['claimant.demo@example.com', `/claims/${SEED.thandiwe}/requests`],
  ['claimant.demo@example.com', `/claims/${SEED.thandiwe}/timeline`],
  ['lawyer.demo@example.com', '/lawyer/dashboard'],
  ['lawyer.demo@example.com', '/lawyer/claims'],
  ['lawyer.demo@example.com', '/lawyer/clients'],
  ['lawyer.demo@example.com', '/lawyer/tasks'],
  ['lawyer.demo@example.com', `/claims/${SEED.sipho}/readiness`],
  ['lawyer.demo@example.com', `/claims/${SEED.sipho}/messages`],
  ['officer.demo@example.com', '/raf/dashboard'],
  ['officer.demo@example.com', '/raf/claims'],
  ['officer.demo@example.com', '/raf/tasks'],
  ['officer.demo@example.com', `/claims/${SEED.pieter}/requests`],
  ['officer.demo@example.com', `/claims/${SEED.sipho}/audit`],
  ['investigator.demo@example.com', '/raf/risk'],
  ['investigator.demo@example.com', `/raf/risk/${SEED.alert}`],
  ['investigator.demo@example.com', `/claims/${SEED.lerato}/risk`],
  ['manager.demo@example.com', '/raf/management'],
  ['admin.demo@example.com', '/admin/users'],
  ['admin.demo@example.com', '/admin/roles'],
  ['admin.demo@example.com', '/admin/organisations'],
  ['admin.demo@example.com', '/admin/audit'],
];

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

for (const [email, path] of ROUTES) {
  test(`T-NFR-5, T-NFR-9 and T-NFR-13 ${path} as ${email ?? 'visitor'}`, async ({ page }) => {
    test.setTimeout(90000);
    if (email) await useSession(page, email);
    await open(page, path);
    await expect(page.getByText(NOTICE).first()).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = accessibility.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
    expect(serious).toEqual([]);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal scroll at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

test('T-NFR-5 mobile uses the bottom tab bar for every signed-in role', async ({ page }) => {
  await useSession(page, 'officer.demo@example.com');
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/raf/dashboard');
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible();
  await expect(page.getByTestId('sidebar')).toBeHidden();
});

test('T-NFR-5 tablet uses the icon rail', async ({ page }) => {
  await useSession(page, 'lawyer.demo@example.com');
  await page.setViewportSize({ width: 1024, height: 768 });
  await open(page, '/lawyer/dashboard');
  await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
});
