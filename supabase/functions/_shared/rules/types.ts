export type ReadinessCategory = 'documentation' | 'required_information' | 'identity' | 'timeline' | 'cross_document';
export type CheckResult = 'passed' | 'failed' | 'not_applicable';
export type Impact = 'blocking' | 'warning';
export type FieldKey = 'full_name' | 'id_number' | 'date_of_birth' | 'accident_date' | 'admission_date' | 'treating_facility' | 'diagnosis' | 'vehicle_registration';

export type RuleConfig = {
  id: string;
  version: string;
  enabled: boolean;
  impact: Impact;
  readiness_category: ReadinessCategory;
  explanation: string;
  corrective_action: string;
  creates_risk_alert: boolean;
  risk_indicator: 'identity_mismatch' | 'date_inconsistency' | 'duplicate_hash' | null;
  risk_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
};

export type FieldInput = {
  id: string;
  field_key: FieldKey;
  value: string | null;
  confidence: number | null;
  source_page: number | null;
  validation_status: 'suggested' | 'validated' | 'corrected';
};

export type DocumentInput = {
  document_id: string;
  version_id: string;
  category_key: string;
  category_name: string;
  filename: string;
  sha256: string | null;
  fields: FieldInput[];
};

export type ClaimInput = {
  claimant_id: string | null;
  claimant_name: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  accident_date: string | null;
  accident_province: string | null;
  claimant_role: string | null;
  accident_description: string | null;
};

export type Weights = Record<ReadinessCategory, number>;

export type EngineInput = {
  claim: ClaimInput;
  required_categories: Array<{ key: string; name: string }>;
  documents: DocumentInput[];
  rules: RuleConfig[];
  weights: Weights;
  rules_version: string;
};

export type Evidence = { source: string; field: string; value?: string; document_id?: string; version_id?: string; field_id?: string };

export type Check = { rule_id: string; rule_version: string; result: CheckResult; details: { key?: string } };

export type Issue = {
  rule_id: string;
  issue_key: string;
  title: string;
  explanation: string;
  corrective_action: string;
  impact: Impact;
  evidence: Evidence[];
};

export type RuleOutput = { checks: Check[]; issues: Issue[] };

export type Rule = (input: EngineInput, rule: RuleConfig) => RuleOutput;

export type Alert = {
  rule_id: string;
  issue_key: string;
  indicator_type: NonNullable<RuleConfig['risk_indicator']>;
  severity: NonNullable<RuleConfig['risk_severity']>;
  title: string;
  explanation: string;
};

export type AssessmentResult = {
  rules_version: string;
  input_hash: string;
  score: number;
  category_scores: Weights;
  blocking_count: number;
  warning_count: number;
  checks: Check[];
  issues: Issue[];
  alerts: Alert[];
};

export const makeCheck = (rule: RuleConfig, result: CheckResult, key?: string): Check => ({
  rule_id: rule.id,
  rule_version: rule.version,
  result,
  details: key ? { key } : {},
});

export const makeIssue = (rule: RuleConfig, issue_key: string, title: string, evidence: Evidence[]): Issue => ({
  rule_id: rule.id,
  issue_key,
  title,
  explanation: rule.explanation,
  corrective_action: rule.corrective_action,
  impact: rule.impact,
  evidence,
});
