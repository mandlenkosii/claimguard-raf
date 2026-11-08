import { describe, expect, it } from 'vitest';

describe('T-SETUP-4 local backend', () => {
  it('T-SETUP-4 the anon client reaches the Auth health endpoint without error', async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    expect(url, 'VITE_SUPABASE_URL is set in .env').toBeTruthy();
    expect(anonKey, 'VITE_SUPABASE_ANON_KEY is set in .env').toBeTruthy();

    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey as string } });
    expect(response.ok).toBe(true);
  });
});
