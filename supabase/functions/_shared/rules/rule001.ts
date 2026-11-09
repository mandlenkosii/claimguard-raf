import { makeCheck, makeIssue, type Rule } from './types.ts';

/** BR7: a completeness issue, never a risk alert. */
export const rule001: Rule = (input, rule) => {
  const supplied = new Set(input.documents.map((document) => document.category_key));
  const missing = input.required_categories.filter((category) => !supplied.has(category.key));
  return {
    checks: input.required_categories.map((category) => makeCheck(rule, supplied.has(category.key) ? 'passed' : 'failed', `missing:${category.key}`)),
    issues: missing.map((category) => makeIssue(rule, `missing:${category.key}`, `${category.name} missing`, [{ source: category.name, field: 'category' }])),
  };
};
