import { describe, expect, it } from 'vitest';

const endpoint = () => `${process.env.VITE_SUPABASE_URL}/functions/v1/demo-sign-in`;
const call = (body: unknown) =>
  fetch(endpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: process.env.VITE_SUPABASE_ANON_KEY! },
    body: JSON.stringify(body),
  });

describe('T-INT-5 demo sign-in', () => {
  it('T-INT-5 a role key returns a session and never the password', async () => {
    const response = await call({ role: 'claimant' });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(process.env.DEMO_USER_PASSWORD!);
    const body = JSON.parse(text);
    expect(body.access_token).toEqual(expect.any(String));
    expect(body.refresh_token).toEqual(expect.any(String));
  });

  it('T-INT-5 an unknown role is refused', async () => {
    expect((await call({ role: 'superuser' })).status).toBe(400);
  });

  it('T-INT-5 an email address is refused', async () => {
    expect((await call({ email: 'admin.demo@example.com' })).status).toBe(400);
  });

  it('T-INT-5 a second-account demo address cannot be reached through the role key', async () => {
    expect((await call({ role: 'claimant2' })).status).toBe(400);
  });
});
