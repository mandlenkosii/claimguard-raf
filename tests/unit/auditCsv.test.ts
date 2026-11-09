import { describe, expect, it } from 'vitest';
import { auditToCsv } from '@/features/admin/auditCsv';

const row = { id: 1, created_at: '2026-02-25T10:00:00Z', actor_name: 'Demo, Officer', actor_role: 'raf_officer', action: 'STATUS_CHANGED', resource_type: 'claim', resource_id: 'c1', outcome: 'success', change_summary: {}, reason: '=HYPERLINK("x")', session_ref: null };

describe('Audit export', () => {
  it('T-S24-1 writes a header and quotes commas', () => {
    const [header, line] = auditToCsv([row]).split('\r\n');
    expect(header).toBe('Time,Actor,Role,Event,Resource,Outcome,Reason,Session');
    expect(line).toContain('"Demo, Officer"');
  });

  it('T-S24-1 neutralises spreadsheet formulas', () => {
    expect(auditToCsv([row])).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
