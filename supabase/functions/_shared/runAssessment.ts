// OP24: gathers one claim's inputs, runs the rules and saves the result in a single transaction.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
import { assess } from './rules/readiness.ts';
import type { DocumentInput, EngineInput, FieldInput } from './rules/types.ts';

type VersionRow = {
  id: string;
  version: number;
  filename: string;
  sha256: string | null;
  confirmed: boolean;
  document_extractions: Array<{ status: string; created_at: string; extracted_fields: FieldInput[] }>;
};
type DocumentRow = { id: string; category_key: string; document_categories: { name: string }; document_versions: VersionRow[] };

function toDocument(row: DocumentRow): DocumentInput[] {
  const version = row.document_versions.filter((item) => item.confirmed).sort((a, b) => b.version - a.version)[0];
  if (!version) return [];
  const extraction = version.document_extractions.filter((item) => item.status === 'succeeded').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return [
    {
      document_id: row.id,
      version_id: version.id,
      category_key: row.category_key,
      category_name: row.document_categories.name,
      filename: version.filename,
      sha256: version.sha256,
      fields: (extraction?.extracted_fields ?? []).map((item) => ({ ...item, confidence: item.confidence === null ? null : Number(item.confidence) })),
    },
  ];
}

async function loadInput(admin: SupabaseClient, claimId: string): Promise<EngineInput> {
  const [claim, categories, documents, rules, settings] = await Promise.all([
    admin.from('claims').select('claimant_id, accident_date, accident_province, claimant_role, accident_description, claimants(first_name, surname, id_number, date_of_birth)').eq('id', claimId).single(),
    admin.from('document_categories').select('key, name').eq('is_required', true),
    admin
      .from('documents')
      .select('id, category_key, document_categories(name), document_versions(id, version, filename, sha256, confirmed, document_extractions(status, created_at, extracted_fields(id, field_key, value, confidence, source_page, validation_status)))')
      .eq('claim_id', claimId)
      .is('deleted_at', null),
    admin.from('validation_rules').select('id, version, enabled, impact, readiness_category, explanation, corrective_action, creates_risk_alert, risk_indicator, risk_severity'),
    admin.from('readiness_settings').select('*').single(),
  ]);
  const failure = claim.error ?? categories.error ?? documents.error ?? rules.error ?? settings.error;
  if (failure) throw new Error(failure.message);

  const row = claim.data as unknown as EngineInput['claim'] & { claimants: { first_name: string; surname: string; id_number: string | null; date_of_birth: string | null } };
  const { claimants: person, ...fields } = row;
  return {
    claim: { ...fields, claimant_name: `${person.first_name} ${person.surname}`, id_number: person.id_number, date_of_birth: person.date_of_birth },
    required_categories: categories.data!,
    documents: (documents.data as unknown as DocumentRow[]).flatMap(toDocument),
    rules: rules.data as EngineInput['rules'],
    weights: {
      documentation: settings.data.weight_documentation,
      required_information: settings.data.weight_required_information,
      identity: settings.data.weight_identity,
      timeline: settings.data.weight_timeline,
      cross_document: settings.data.weight_cross_document,
    },
    rules_version: settings.data.rules_version,
  };
}

export async function runAssessment(admin: SupabaseClient, claimId: string, triggeredBy: string | null): Promise<void> {
  const result = assess(await loadInput(admin, claimId));
  const { error } = await admin.rpc('save_readiness_assessment', { p_claim: claimId, p_result: result, p_triggered_by: triggeredBy });
  if (error) throw new Error(error.message);
}
