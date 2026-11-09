import type { Evidence, EngineInput, FieldKey } from './types.ts';

export type ComparedField = Extract<FieldKey, 'full_name' | 'id_number' | 'date_of_birth' | 'accident_date'>;
export type Source = { label: string; value: string; document_id?: string; version_id?: string; field_id?: string };
export type Comparison = { field: ComparedField; sources: Source[]; match: boolean };

export const CLAIM_RECORD = 'Claim record';

const CLAIM_VALUE: Record<ComparedField, keyof EngineInput['claim']> = {
  full_name: 'claimant_name',
  id_number: 'id_number',
  date_of_birth: 'date_of_birth',
  accident_date: 'accident_date',
};

const nameTokens = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);

/** The surname must agree; a first name may be given as an initial, and middle names are ignored. */
export function namesMatch(first: string, second: string): boolean {
  const a = nameTokens(first);
  const b = nameTokens(second);
  if (!a.length || !b.length || a.at(-1) !== b.at(-1)) return false;
  const [x, y] = [a[0]!, b[0]!];
  return x === y || (x.length === 1 && y.startsWith(x)) || (y.length === 1 && x.startsWith(y));
}

const sameValue = (field: ComparedField, a: string, b: string) => {
  if (field === 'full_name') return namesMatch(a, b);
  if (field === 'id_number') return a.replace(/\s/g, '').toUpperCase() === b.replace(/\s/g, '').toUpperCase();
  return a.trim().slice(0, 10) === b.trim().slice(0, 10);
};

export function sourcesFor(input: EngineInput, field: FieldKey): Source[] {
  const sources: Source[] = [];
  const claimValue = field in CLAIM_VALUE ? input.claim[CLAIM_VALUE[field as ComparedField]] : null;
  if (claimValue?.trim()) sources.push({ label: CLAIM_RECORD, value: claimValue });
  for (const document of input.documents) {
    for (const item of document.fields) {
      if (item.field_key === field && item.value?.trim()) {
        sources.push({ label: document.category_name, value: item.value, document_id: document.document_id, version_id: document.version_id, field_id: item.id });
      }
    }
  }
  return sources;
}

export function toEvidence(field: string, source: Source): Evidence {
  const { label, ...rest } = source;
  return { source: label, field, ...rest };
}

/** US34: compares each identity and date field wherever at least two sources hold it. */
export function collectComparisons(input: EngineInput): Comparison[] {
  const fields = Object.keys(CLAIM_VALUE) as ComparedField[];
  return fields.flatMap((field) => {
    const sources = sourcesFor(input, field);
    if (sources.length < 2) return [];
    const match = sources.every((a) => sources.every((b) => sameValue(field, a.value, b.value)));
    return [{ field, sources, match }];
  });
}
