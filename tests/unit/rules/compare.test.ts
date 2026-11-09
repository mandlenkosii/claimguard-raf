import { describe, expect, it } from 'vitest';
import { collectComparisons, namesMatch } from '@rules/compare';
import { document, field, input } from './fixtures';

describe('Cross-document comparison', () => {
  it('T-US34-1 name, ID number and accident date are compared across sources', () => {
    const comparisons = collectComparisons(input({
      claim: { ...input().claim, id_number: 'SYN1' },
      documents: [document('identity_document', [field('full_name', 'Sipho Ndlovu'), field('id_number', 'SYN2')]), document('accident_report', [field('accident_date', '2026-03-12')])],
    }));
    expect(comparisons.map((item) => item.field)).toEqual(expect.arrayContaining(['full_name', 'id_number', 'accident_date']));
    expect(comparisons.find((item) => item.field === 'id_number')!.match).toBe(false);
    expect(comparisons.find((item) => item.field === 'accident_date')!.match).toBe(true);
    expect(comparisons.find((item) => item.field === 'full_name')!.sources.map((source) => source.label)).toEqual(['Claim record', 'Identity document']);
  });

  it.each([
    ['Sipho Ndlovu', 'Sipho M. Ndlovu', true],
    ['SIPHO NDLOVU', 'sipho ndlovu', true],
    ['S. Ndlovu', 'Sipho Ndlovu', true],
    ['Sipho M. Ndlovu', 'S. Ndhlovu', false],
    ['Sipho Ndlovu', 'Thabo Ndlovu', false],
  ])('T-US34-1 namesMatch(%s, %s) is %s', (a, b, expected) => {
    expect(namesMatch(a, b)).toBe(expected);
  });
});
