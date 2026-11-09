import { describe, expect, it } from 'vitest';
import { rule003 } from '@rules/rule003';
import { document, field, input, ruleById } from './fixtures';

const dates = (accident: string, admission: string) =>
  input({ documents: [document('accident_report', [field('accident_date', accident)]), document('hospital_medical_report', [field('admission_date', admission)])] });

describe('RULE-003', () => {
  it('T-BR9-1 12 Mar 2026 vs 21 Mar 2026 is a review issue with the PRD action', () => {
    const { issues } = rule003(dates('2026-03-12', '2026-03-21'), ruleById('RULE-003'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ issue_key: 'conflict:accident_date', corrective_action: 'Confirm dates and correct errors.', impact: 'warning' });
  });

  it('T-US36-1 the issue lists the source fields and documents', () => {
    const evidence = rule003(dates('2026-03-12', '2026-03-21'), ruleById('RULE-003')).issues[0]!.evidence;
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'Accident report', field: 'accident_date', value: '2026-03-12', document_id: 'doc-accident_report' }),
      expect.objectContaining({ source: 'Hospital medical report', field: 'admission_date', value: '2026-03-21', document_id: 'doc-hospital_medical_report' }),
    ]));
  });

  it('T-BR9 an admission within 7 days of the accident passes', () => {
    expect(rule003(dates('2026-03-12', '2026-03-19'), ruleById('RULE-003')).issues).toEqual([]);
  });

  it('T-BR9 an admission before the accident fails', () => {
    expect(rule003(dates('2026-03-12', '2026-03-11'), ruleById('RULE-003')).issues).toHaveLength(1);
  });

  it('T-BR9 accident dates that disagree between sources fail', () => {
    const conflict = input({ claim: { ...input().claim, accident_date: '2026-03-01' }, documents: [document('accident_report', [field('accident_date', '2026-03-12')])] });
    expect(rule003(conflict, ruleById('RULE-003')).issues).toHaveLength(1);
  });
});
