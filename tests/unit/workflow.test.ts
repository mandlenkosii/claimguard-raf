import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canTransition, WORKFLOW_MATRIX } from '@rules/workflow';

// The Must rows of Section 8.3. Withdrawn, Rejected and Escalated (Should, US69) arrive in Phase 12.
const ROWS: Array<[string, string, string[]]> = [
  ['draft', 'documents_needed', ['claimant', 'lawyer']],
  ['documents_needed', 'validation', ['claimant', 'lawyer']],
  ['validation', 'ready', ['claimant', 'lawyer', 'raf_officer']],
  ['ready', 'submitted', ['claimant', 'lawyer']],
  ['submitted', 'raf_review', ['raf_officer']],
  ['raf_review', 'information_required', ['raf_officer']],
  ['raf_review', 'assessment', ['raf_officer']],
  ['information_required', 'raf_review', ['raf_officer']],
  ['assessment', 'negotiation', ['raf_officer']],
  ['negotiation', 'settlement', ['raf_officer']],
  ['settlement', 'closed', ['raf_officer']],
];
const ROLES = ['claimant', 'lawyer', 'raf_officer', 'investigator', 'manager', 'admin'] as const;

describe('T-US65-1 and T-BR4-1 workflow matrix', () => {
  it.each(ROWS)('T-US65-1 %s to %s is allowed only for the listed roles', (from, to, allowed) => {
    for (const role of ROLES) {
      expect(canTransition(from, to, [role]), role).toBe(allowed.includes(role));
    }
  });

  it('T-US65-1 anything not listed is refused', () => {
    expect(canTransition('draft', 'settlement', ['claimant'])).toBe(false);
    expect(canTransition('draft', 'ready', ['claimant', 'lawyer', 'raf_officer'])).toBe(false);
  });

  it('T-BR4-1 workflow.ts and the SQL function allow exactly the same set', () => {
    const migration = readFileSync(resolve(__dirname, '../../supabase/migrations/20261108000200_ops_claims_workflow.sql'), 'utf8');
    const block = migration.match(/workflow_matrix[\s\S]*?\$\$([\s\S]*?)\$\$/)?.[1] ?? '';
    const sql = [...block.matchAll(/\('(\w+)','(\w+)','(\w+)'\)/g)].map((match) => `${match[1]}>${match[2]}>${match[3]}`).sort();
    const ts = WORKFLOW_MATRIX.map((row) => `${row.from}>${row.to}>${row.role}`).sort();
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toEqual(ts);
  });
});
