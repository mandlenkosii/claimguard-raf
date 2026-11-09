import { expect, test } from '@playwright/test';
import { useSession } from './session';

const PAGES: Array<[string, string, string]> = [
  ['lawyer.demo@example.com', '/lawyer/dashboard', 'Needs your attention'],
  ['officer.demo@example.com', '/raf/claims', 'Claims queue'],
  ['investigator.demo@example.com', '/raf/risk', 'Risk queue'],
  ['manager.demo@example.com', '/raf/management', 'Claims by status'],
];

for (const [email, path, text] of PAGES) {
  test(`T-NFR-1 ${path} loads within 3 seconds after the first load`, async ({ page }) => {
    await useSession(page, email);
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
    const started = Date.now();
    await page.reload();
    await expect(page.getByText(text).first()).toBeVisible();
    expect(Date.now() - started).toBeLessThan(3000);
  });
}
