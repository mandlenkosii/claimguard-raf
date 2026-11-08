import { describe, expect, it } from 'vitest';
import { missingRequiredFields } from '@rules/requiredFields';

const complete = { claimant_id: 'x', accident_date: '2026-01-01', accident_province: 'Gauteng', claimant_role: 'driver', accident_description: 'Text' };

describe('T-BR3-1 required claim fields', () => {
  it('T-BR3-1 returns nothing for a complete claim', () => {
    expect(missingRequiredFields(complete)).toEqual([]);
  });

  it('T-BR3-1 returns exactly the empty required fields', () => {
    expect(missingRequiredFields({ ...complete, accident_date: null, accident_description: '  ' })).toEqual(['accident_date', 'accident_description']);
  });

  it('T-BR3-1 an empty claim is missing all five', () => {
    expect(missingRequiredFields({})).toEqual(['claimant_id', 'accident_date', 'accident_province', 'claimant_role', 'accident_description']);
  });
});
