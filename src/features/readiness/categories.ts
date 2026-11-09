export const READINESS_CATEGORIES = [
  { key: 'documentation', label: 'Documentation completeness', rules: ['RULE-001'] },
  { key: 'required_information', label: 'Required information', rules: ['RULE-000'] },
  { key: 'identity', label: 'Identity consistency', rules: ['RULE-002'] },
  { key: 'timeline', label: 'Timeline consistency', rules: ['RULE-003'] },
  { key: 'cross_document', label: 'Cross-document consistency', rules: ['RULE-004', 'RULE-005'] },
] as const;

export type CategoryKey = (typeof READINESS_CATEGORIES)[number]['key'];
