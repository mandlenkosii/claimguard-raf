import { describe, expect, it } from 'vitest';
import { issueActionLabel } from '@rules/readiness';
import { RULES } from './fixtures';

describe('T-BR14-1 every rule explains itself', () => {
  it.each(RULES.map((rule) => [rule.id, rule] as const))('T-BR14-1 %s has an explanation and a corrective action', (_id, rule) => {
    expect(rule.explanation.trim()).not.toBe('');
    expect(rule.corrective_action.trim()).not.toBe('');
  });

  it('T-US27-1 a missing document offers "Upload document"', () => {
    expect(issueActionLabel('RULE-001')).toBe('Upload document');
  });

  it.each(RULES.map((rule) => rule.id))('T-US31-1 %s has a recommended action label', (id) => {
    expect(issueActionLabel(id).length).toBeGreaterThan(0);
  });
});
