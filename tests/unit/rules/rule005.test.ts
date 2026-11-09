import { describe, expect, it } from 'vitest';
import { rule005 } from '@rules/rule005';
import { document, field, input, ruleById } from './fixtures';

describe('RULE-005', () => {
  it('T-BR11-1 a field below 0.70 needs manual verification', () => {
    const { issues } = rule005(input({ documents: [document('identity_document', [field('full_name', 'A', 0.69, 'f1')])] }), ruleById('RULE-005'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ issue_key: 'low_confidence:f1', explanation: 'Manual verification required.' });
  });

  it('T-BR11-1 exactly 0.70 passes', () => {
    expect(rule005(input({ documents: [document('identity_document', [field('full_name', 'A', 0.7)])] }), ruleById('RULE-005')).issues).toEqual([]);
  });

  it('T-BR11 a field already validated by a person passes', () => {
    const validated = { ...field('full_name', 'A', 0.5), validation_status: 'validated' as const };
    expect(rule005(input({ documents: [document('identity_document', [validated])] }), ruleById('RULE-005')).issues).toEqual([]);
  });
});
