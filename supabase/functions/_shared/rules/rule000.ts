import { missingRequiredFields, REQUIRED_CLAIM_FIELDS, REQUIRED_FIELD_LABELS } from './requiredFields.ts';
import { makeCheck, makeIssue, type Rule } from './types.ts';

/** Section 18 #10: the required-information checks. Recorded under RULE-000 (Section 18 #58). */
export const rule000: Rule = (input, rule) => {
  const missing = new Set<string>(missingRequiredFields(input.claim));
  return {
    checks: REQUIRED_CLAIM_FIELDS.map((field) => makeCheck(rule, missing.has(field) ? 'failed' : 'passed', `field:${field}`)),
    issues: REQUIRED_CLAIM_FIELDS.filter((field) => missing.has(field)).map((field) =>
      makeIssue(rule, `field:${field}`, `${REQUIRED_FIELD_LABELS[field]} missing`, [{ source: 'Claim record', field }]),
    ),
  };
};
