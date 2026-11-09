import { describe, expect, it } from 'vitest';
import { assess } from '@rules/readiness';
import { rule001 } from '@rules/rule001';
import { CLEAN_DOCUMENTS, input, ruleById, RULES } from './fixtures';

const withoutHospital = input({ documents: CLEAN_DOCUMENTS.filter((item) => item.category_key !== 'hospital_medical_report') });

describe('RULE-001', () => {
  it('T-US27-1 a missing hospital report creates the blocking issue with its action', () => {
    const { issues, checks } = rule001(withoutHospital, ruleById('RULE-001'));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ rule_id: 'RULE-001', issue_key: 'missing:hospital_medical_report', title: 'Hospital medical report missing', impact: 'blocking' });
    expect(checks.filter((check) => check.result === 'failed')).toHaveLength(1);
    expect(checks.filter((check) => check.result === 'passed')).toHaveLength(3);
  });

  it('T-BR7-1 it is a completeness issue with the PRD action', () => {
    expect(rule001(withoutHospital, ruleById('RULE-001')).issues[0]!.corrective_action).toBe('Request or upload the document.');
  });

  it('T-US27-2 missing documents create no risk alert', () => {
    expect(assess(withoutHospital).alerts).toEqual([]);
  });

  it('T-BR7-2 RULE-001 can never be configured to create a risk alert', () => {
    const rules = RULES.map((item) => (item.id === 'RULE-001' ? { ...item, creates_risk_alert: true, risk_indicator: 'identity_mismatch' as const, risk_severity: 'HIGH' as const } : item));
    expect(assess({ ...withoutHospital, rules }).alerts).toEqual([]);
  });
});
