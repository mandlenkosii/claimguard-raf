import { describe, expect, it } from 'vitest';
import { assess, categoryScore, overallScore } from '@rules/readiness';
import { CLEAN_DOCUMENTS, document, field, input, RULES } from './rules/fixtures';

describe('Readiness engine', () => {
  it('T-US28-1 each missing required field is a required-information issue', () => {
    const result = assess(input({ claim: { ...input().claim, accident_date: null, claimant_role: null } }));
    const issues = result.issues.filter((issue) => issue.rule_id === 'RULE-000');
    expect(issues.map((issue) => issue.issue_key)).toEqual(['field:accident_date', 'field:claimant_role']);
    expect(issues[0]).toMatchObject({ title: 'Accident date missing', impact: 'blocking' });
  });

  it('T-BR12-2 a category score is passed ÷ applicable × 100', () => {
    expect(categoryScore([{ result: 'passed' }, { result: 'passed' }, { result: 'passed' }, { result: 'failed' }])).toBe(75);
    expect(categoryScore([{ result: 'not_applicable' }, { result: 'failed' }])).toBe(0);
  });

  it('T-BR12-2 a category with nothing applicable scores 100', () => {
    expect(categoryScore([{ result: 'not_applicable' }])).toBe(100);
    expect(categoryScore([])).toBe(100);
  });

  it('T-US30-1 the overall score uses the 30/25/15/15/15 weights', () => {
    const weights = input().weights;
    expect(overallScore({ documentation: 75, required_information: 100, identity: 100, timeline: 100, cross_document: 100 }, weights)).toBe(93);
    expect(overallScore({ documentation: 100, required_information: 100, identity: 0, timeline: 100, cross_document: 100 }, weights)).toBe(85);
    expect(overallScore({ documentation: 0, required_information: 0, identity: 0, timeline: 0, cross_document: 0 }, weights)).toBe(0);
  });

  it('T-BR12-1 the weights total 100', () => {
    expect(Object.values(input().weights).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(() => assess(input({ weights: { ...input().weights, identity: 16 } }))).toThrow(/100/);
  });

  it('T-US30-2 and T-BR12-3 identical inputs and rules version give identical results', () => {
    expect(assess(input())).toEqual(assess(input()));
    expect(assess(input()).input_hash).toBe(assess(input()).input_hash);
  });

  it('T-US30-2 the order of documents does not change the result', () => {
    expect(assess(input({ documents: [...CLEAN_DOCUMENTS].reverse() })).input_hash).toBe(assess(input()).input_hash);
  });

  it('T-BR12-3 a different rules version gives a different hash', () => {
    expect(assess(input({ rules_version: '2.0.0' })).input_hash).not.toBe(assess(input()).input_hash);
  });

  it('T-US29 every enabled rule produces a check, and every check records the rule version', () => {
    const { checks } = assess(input());
    expect([...new Set(checks.map((check) => check.rule_id))].sort()).toEqual(RULES.map((rule) => rule.id).sort());
    expect(checks.every((check) => check.rule_version === '1.0.0')).toBe(true);
  });

  it('T-BR12 a disabled rule produces nothing', () => {
    const rules = RULES.map((rule) => (rule.id === 'RULE-004' ? { ...rule, enabled: false } : rule));
    const result = assess(input({ rules, documents: [document('identity_document', [], 'x'), document('accident_report', [], 'x')] }));
    expect(result.checks.some((check) => check.rule_id === 'RULE-004')).toBe(false);
    expect(result.issues.some((issue) => issue.rule_id === 'RULE-004')).toBe(false);
  });

  it('T-BR13 a clean claim scores 100 with no issues', () => {
    expect(assess(input())).toMatchObject({ score: 100, blocking_count: 0, warning_count: 0, issues: [] });
  });

  it('T-BR13 a high score still reports its blocking issue', () => {
    const result = assess(input({ documents: CLEAN_DOCUMENTS.slice(1) }));
    expect(result.score).toBe(93);
    expect(result.blocking_count).toBe(1);
  });

  it('T-US31 every issue has an explanation and a corrective action', () => {
    const result = assess(input({ claim: { ...input().claim, accident_date: null }, documents: [document('identity_document', [field('full_name', 'Thabo Other', 0.5)])] }));
    expect(result.issues.length).toBeGreaterThan(1);
    for (const issue of result.issues) {
      expect(issue.explanation).not.toBe('');
      expect(issue.corrective_action).not.toBe('');
    }
  });
});
