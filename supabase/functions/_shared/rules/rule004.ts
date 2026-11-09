import { makeCheck, makeIssue, type Rule } from './types.ts';
import type { DocumentInput } from './types.ts';

/** BR10: a potential duplicate only. A person decides whether it was expected. */
export const rule004: Rule = (input, rule) => {
  const groups = new Map<string, DocumentInput[]>();
  for (const document of input.documents) {
    if (document.sha256) groups.set(document.sha256, [...(groups.get(document.sha256) ?? []), document]);
  }
  if (!groups.size) return { checks: [makeCheck(rule, 'not_applicable')], issues: [] };

  const duplicates = [...groups.entries()].filter(([, documents]) => documents.length > 1);
  if (!duplicates.length) return { checks: [makeCheck(rule, 'passed')], issues: [] };
  return {
    checks: duplicates.map(([hash]) => makeCheck(rule, 'failed', `duplicate:${hash}`)),
    issues: duplicates.map(([hash, documents]) =>
      makeIssue(
        rule,
        `duplicate:${hash}`,
        'Potential duplicate document',
        documents.map((document) => ({ source: document.category_name, field: 'file', value: document.filename, document_id: document.document_id, version_id: document.version_id })),
      ),
    ),
  };
};
