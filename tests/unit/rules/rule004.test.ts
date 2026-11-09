import { describe, expect, it } from 'vitest';
import { rule004 } from '@rules/rule004';
import { document, input, ruleById } from './fixtures';

describe('RULE-004', () => {
  it('T-BR10-1 two versions with the same sha256 give a potential duplicate finding', () => {
    const { issues } = rule004(input({ documents: [document('identity_document', [], 'same'), document('accident_report', [], 'same')] }), ruleById('RULE-004'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ issue_key: 'duplicate:same', corrective_action: 'Determine whether duplication is expected.' });
    expect(issues[0]!.evidence).toHaveLength(2);
  });

  it('T-BR10 different files pass', () => {
    const { issues, checks } = rule004(input(), ruleById('RULE-004'));
    expect(issues).toEqual([]);
    expect(checks.every((check) => check.result === 'passed')).toBe(true);
  });

  it('T-BR10 files without a hash are not compared', () => {
    expect(rule004(input({ documents: [document('identity_document', [], null), document('accident_report', [], null)] }), ruleById('RULE-004')).checks).toEqual([expect.objectContaining({ result: 'not_applicable' })]);
  });
});
