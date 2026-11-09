import { makeCheck, makeIssue, type Rule } from './types.ts';

/** Section 18 #13. */
export const CONFIDENCE_THRESHOLD = 0.7;

const LABELS: Record<string, string> = {
  full_name: 'Full name',
  id_number: 'ID number',
  date_of_birth: 'Date of birth',
  accident_date: 'Accident date',
  admission_date: 'Admission date',
  treating_facility: 'Treating facility',
  diagnosis: 'Diagnosis',
  vehicle_registration: 'Vehicle registration',
};

/** BR11: a low-confidence value needs a person to check it, unless a person already has. */
export const rule005: Rule = (input, rule) => {
  const candidates = input.documents.flatMap((document) =>
    document.fields.filter((item) => item.confidence !== null && item.validation_status === 'suggested').map((item) => ({ document, item })),
  );
  if (!candidates.length) return { checks: [makeCheck(rule, 'not_applicable')], issues: [] };

  const isLow = (confidence: number | null) => (confidence ?? 1) < CONFIDENCE_THRESHOLD;
  return {
    checks: candidates.map(({ item }) => makeCheck(rule, isLow(item.confidence) ? 'failed' : 'passed', `low_confidence:${item.id}`)),
    issues: candidates
      .filter(({ item }) => isLow(item.confidence))
      .map(({ document, item }) =>
        makeIssue(rule, `low_confidence:${item.id}`, `${LABELS[item.field_key] ?? item.field_key} needs manual verification`, [
          { source: document.category_name, field: item.field_key, value: item.value ?? '', document_id: document.document_id, version_id: document.version_id, field_id: item.id },
        ]),
      ),
  };
};
