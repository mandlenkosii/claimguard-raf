import { describe, expect, it } from 'vitest';
import { adminClient } from './helpers';

describe('T-NFR-11 audit rows', () => {
  it('hold no passwords, tokens or identity numbers', async () => {
    const { data, error } = await adminClient().from('audit_logs').select('change_summary, reason').order('id', { ascending: false }).limit(1000);
    expect(error).toBeNull();
    const text = JSON.stringify(data);
    expect(text).not.toContain(process.env.DEMO_USER_PASSWORD!);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(text).not.toMatch(/sb_secret_/);
    expect(text).not.toMatch(/SAMPLE fictional extracted text/);
    expect(text).not.toMatch(/"id_number"/);
  });
});

