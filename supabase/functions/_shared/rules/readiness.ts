import { rule000 } from './rule000.ts';
import { rule001 } from './rule001.ts';
import { rule002 } from './rule002.ts';
import { rule003 } from './rule003.ts';
import { rule004 } from './rule004.ts';
import { rule005 } from './rule005.ts';
import type { Alert, AssessmentResult, Check, EngineInput, Issue, ReadinessCategory, Rule, Weights } from './types.ts';

const RUNNERS: Record<string, Rule> = { 'RULE-000': rule000, 'RULE-001': rule001, 'RULE-002': rule002, 'RULE-003': rule003, 'RULE-004': rule004, 'RULE-005': rule005 };
const CATEGORIES: ReadinessCategory[] = ['documentation', 'required_information', 'identity', 'timeline', 'cross_document'];

const ACTION_LABELS: Record<string, string> = {
  'RULE-000': 'Complete claim details',
  'RULE-001': 'Upload document',
  'RULE-002': 'Review documents',
  'RULE-003': 'Review documents',
  'RULE-004': 'Review documents',
  'RULE-005': 'Review documents',
};

/** The button on an issue card (US27, US31). */
export const issueActionLabel = (ruleId: string): string => ACTION_LABELS[ruleId] ?? 'Review documents';

/** BR12: passed ÷ applicable × 100. A category with nothing to check has nothing wrong with it. */
export function categoryScore(checks: Array<Pick<Check, 'result'>>): number {
  const applicable = checks.filter((check) => check.result !== 'not_applicable');
  if (!applicable.length) return 100;
  return Math.round((applicable.filter((check) => check.result === 'passed').length / applicable.length) * 100);
}

export function overallScore(scores: Weights, weights: Weights): number {
  return Math.round(CATEGORIES.reduce((total, category) => total + scores[category] * weights[category], 0) / 100);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

/** A fingerprint of the inputs (BR12), not a security measure: two FNV-1a lanes. */
function fingerprint(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x811c9dc5);
  }
  return [a, b].map((lane) => (lane >>> 0).toString(16).padStart(8, '0')).join('');
}

const byString = <T>(key: (item: T) => string) => (first: T, second: T) => key(first).localeCompare(key(second));

function normalise(input: EngineInput): EngineInput {
  return {
    ...input,
    rules: [...input.rules].sort(byString((rule) => rule.id)),
    required_categories: [...input.required_categories].sort(byString((category) => category.key)),
    documents: [...input.documents]
      .sort(byString((document) => document.document_id))
      .map((document) => ({ ...document, fields: [...document.fields].sort(byString((item) => item.id)) })),
  };
}

function alertsFor(issues: Issue[], input: EngineInput): Alert[] {
  return issues.flatMap((issue) => {
    const rule = input.rules.find((item) => item.id === issue.rule_id)!;
    // BR7: RULE-001 is a completeness problem, however it is configured.
    if (rule.id === 'RULE-001' || !rule.creates_risk_alert || !rule.risk_indicator || !rule.risk_severity) return [];
    return [
      {
        rule_id: rule.id,
        issue_key: issue.issue_key,
        indicator_type: rule.risk_indicator,
        severity: rule.risk_severity,
        title: issue.title,
        explanation: `${issue.explanation} This is an indicator for human review, not a conclusion.`,
      },
    ];
  });
}

/** BR7–BR14: runs the enabled rules. The same input and rules version always give the same result. */
export function assess(raw: EngineInput): AssessmentResult {
  const total = CATEGORIES.reduce((sum, category) => sum + raw.weights[category], 0);
  if (total !== 100) throw new Error(`Readiness weights must total 100, got ${total}`);

  const input = normalise(raw);
  const enabled = input.rules.filter((rule) => rule.enabled && RUNNERS[rule.id]);
  const outputs = enabled.map((rule) => ({ rule, output: RUNNERS[rule.id]!(input, rule) }));
  const checks = outputs.flatMap(({ output }) => output.checks);
  const issues = outputs.flatMap(({ output }) => output.issues);

  const category_scores = Object.fromEntries(
    CATEGORIES.map((category) => [category, categoryScore(outputs.filter(({ rule }) => rule.readiness_category === category).flatMap(({ output }) => output.checks))]),
  ) as Weights;

  return {
    rules_version: input.rules_version,
    input_hash: fingerprint(JSON.stringify(canonical(input))),
    score: overallScore(category_scores, input.weights),
    category_scores,
    blocking_count: issues.filter((issue) => issue.impact === 'blocking').length,
    warning_count: issues.filter((issue) => issue.impact === 'warning').length,
    checks,
    issues,
    alerts: alertsFor(issues, input),
  };
}
