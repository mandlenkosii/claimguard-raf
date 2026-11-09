import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { sessionFor, useSession } from './session';

test('T-EDGE-16 a dropped network keeps the text and saving works after reconnecting', async ({ page, context }) => {
  test.setTimeout(60000);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const claimant = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
  const session = (await sessionFor('claimant2.demo@example.com')) as unknown as { access_token: string; refresh_token: string };
  await claimant.auth.setSession(session);
  const { data: claim } = await claimant.rpc('create_claim', { p_claimant_id: null, p_fields: {} });
  const { data: request } = await admin.from('information_requests').insert({ claim_id: claim.id, title: 'Offline test', description: 'D', recipient_type: 'claimant', created_by: '00000000-0000-4000-8000-000000000005' }).select('id').single();

  await useSession(page, 'claimant2.demo@example.com');
  await page.goto(`/claims/${claim.id}/requests/${request!.id}`);
  const box = page.getByLabel(/Your response/);
  await box.fill('Typed before the network dropped.');

  await context.setOffline(true);
  await expect(page.getByText(/You're offline/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
  await expect(box).toHaveValue('Typed before the network dropped.');

  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect.poll(async () => (await admin.from('information_requests').select('status').eq('id', request!.id).single()).data!.status).toBe('responded');
});
