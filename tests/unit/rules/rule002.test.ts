import { describe, expect, it } from 'vitest';
import { assess } from '@rules/readiness';
import { rule002 } from '@rules/rule002';
import { document, field, input, ruleById, RULES } from './fixtures';

const conflict = input({
  documents: [
    document('identity_document', [field('full_name', 'Sipho M. Ndlovu')]),
    document('hospital_medical_report', [field('full_name', 'S. Ndhlovu')]),
    document('accident_report'),
    document('serious_injury_assessment'),
  ],
});

describe('RULE-002', () => {
  it('T-US35-1 and T-BR8-1 flags "Sipho M. Ndlovu" vs "S. Ndhlovu" as a consistency issue', () => {
    const { issues } = rule002(conflict, ruleById('RULE-002'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ rule_id: 'RULE-002', issue_key: 'conflict:full_name', impact: 'warning' });
    expect(issues[0]!.evidence.map((item) => item.value)).toEqual(expect.arrayContaining(['Sipho M. Ndlovu', 'S. Ndhlovu']));
  });

  it('T-BR8-2 creates a risk alert only when configured', () => {
    expect(assess(conflict).alerts).toEqual([expect.objectContaining({ rule_id: 'RULE-002', indicator_type: 'identity_mismatch', severity: 'MEDIUM' })]);
    const rules = RULES.map((item) => (item.id === 'RULE-002' ? { ...item, creates_risk_alert: false } : item));
    expect(assess({ ...conflict, rules }).alerts).toEqual([]);
  });

  it('T-BR18 alert text never calls anything fraud', () => {
    expect(JSON.stringify(assess(conflict).alerts)).not.toMatch(/fraud/i);
  });

  it('T-US29 with too little to compare the check is not applicable', () => {
    expect(rule002(input(), ruleById('RULE-002')).checks).toEqual([expect.objectContaining({ result: 'not_applicable' })]);
  });
});
