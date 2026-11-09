import { collectComparisons, toEvidence, type ComparedField } from './compare.ts';
import { makeCheck, makeIssue, type Rule } from './types.ts';

const TITLES: Partial<Record<ComparedField, string>> = {
  full_name: 'Claimant name differs between documents',
  id_number: 'ID number differs between documents',
  date_of_birth: 'Date of birth differs between documents',
};

/** BR8: a consistency issue; a person makes the final decision. */
export const rule002: Rule = (input, rule) => {
  const comparisons = collectComparisons(input).filter((comparison) => comparison.field in TITLES);
  if (!comparisons.length) return { checks: [makeCheck(rule, 'not_applicable')], issues: [] };
  return {
    checks: comparisons.map((comparison) => makeCheck(rule, comparison.match ? 'passed' : 'failed', `conflict:${comparison.field}`)),
    issues: comparisons
      .filter((comparison) => !comparison.match)
      .map((comparison) => makeIssue(rule, `conflict:${comparison.field}`, TITLES[comparison.field]!, comparison.sources.map((source) => toEvidence(comparison.field, source)))),
  };
};
