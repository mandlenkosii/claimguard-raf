import type { DocumentInput, EngineInput, FieldInput, RuleConfig } from '@rules/types';

const rule = (id: string, category: RuleConfig['readiness_category'], impact: RuleConfig['impact'], extra: Partial<RuleConfig> = {}): RuleConfig => ({
  id,
  version: '1.0.0',
  enabled: true,
  impact,
  readiness_category: category,
  explanation: `${id} explanation`,
  corrective_action: `${id} action`,
  creates_risk_alert: false,
  risk_indicator: null,
  risk_severity: null,
  ...extra,
});

export const RULES: RuleConfig[] = [
  rule('RULE-000', 'required_information', 'blocking'),
  rule('RULE-001', 'documentation', 'blocking', { corrective_action: 'Request or upload the document.' }),
  rule('RULE-002', 'identity', 'warning', { corrective_action: 'Review sources and verify the correct information.', creates_risk_alert: true, risk_indicator: 'identity_mismatch', risk_severity: 'MEDIUM' }),
  rule('RULE-003', 'timeline', 'warning', { corrective_action: 'Confirm dates and correct errors.', creates_risk_alert: true, risk_indicator: 'date_inconsistency', risk_severity: 'HIGH' }),
  rule('RULE-004', 'cross_document', 'warning', { corrective_action: 'Determine whether duplication is expected.', creates_risk_alert: true, risk_indicator: 'duplicate_hash', risk_severity: 'LOW' }),
  rule('RULE-005', 'cross_document', 'warning', { explanation: 'Manual verification required.', corrective_action: 'Review the source document and correct the extracted value.' }),
];

export const ruleById = (id: string) => RULES.find((item) => item.id === id)!;

export const REQUIRED_CATEGORIES = [
  { key: 'identity_document', name: 'Identity document' },
  { key: 'accident_report', name: 'Accident report' },
  { key: 'hospital_medical_report', name: 'Hospital medical report' },
  { key: 'serious_injury_assessment', name: 'Serious injury assessment' },
];

export const field = (field_key: FieldInput['field_key'], value: string, confidence = 0.95, id = `${field_key}-${value}`): FieldInput => ({ id, field_key, value, confidence, source_page: 1, validation_status: 'suggested' });

export const document = (category_key: string, fields: FieldInput[] = [], sha256: string | null = `hash-${category_key}`): DocumentInput => ({
  document_id: `doc-${category_key}`,
  version_id: `ver-${category_key}`,
  category_key,
  category_name: REQUIRED_CATEGORIES.find((item) => item.key === category_key)?.name ?? category_key,
  filename: `${category_key}_SAMPLE.pdf`,
  sha256,
  fields,
});

export const CLEAN_DOCUMENTS = REQUIRED_CATEGORIES.map((item) => document(item.key));

export function input(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    claim: { claimant_id: 'c1', claimant_name: 'Sipho Ndlovu', id_number: null, date_of_birth: null, accident_date: '2026-03-12', accident_province: 'Gauteng', claimant_role: 'driver', accident_description: 'Text' },
    required_categories: REQUIRED_CATEGORIES,
    documents: CLEAN_DOCUMENTS,
    rules: RULES,
    weights: { documentation: 30, required_information: 25, identity: 15, timeline: 15, cross_document: 15 },
    rules_version: '1.0.0',
    ...overrides,
  };
}
