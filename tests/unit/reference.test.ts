import { describe, expect, it } from 'vitest';
import { formatClaimReference } from '@rules/reference';

describe('T-BR1-1 claim reference', () => {
  it('T-BR1-1 formats CG-YYYY-NNNNNN', () => {
    expect(formatClaimReference(2026, 142)).toBe('CG-2026-000142');
  });
});
