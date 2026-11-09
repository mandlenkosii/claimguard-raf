import type { ExtractedField, OcrInput, OcrProvider, OcrResult } from './provider.ts';

// Fictional fixtures keyed by document category. A file name containing FAILURE, LOW_CONFIDENCE,
// IDENTITY_CONFLICT or DATE_CONFLICT selects that scenario.
const FIXTURES: Record<string, Array<Omit<ExtractedField, 'confidence' | 'source_page'>>> = {
  identity_document: [
    { field_key: 'full_name', value: 'SAMPLE Claimant' },
    { field_key: 'id_number', value: 'SYN0000000000' },
    { field_key: 'date_of_birth', value: '1990-01-01' },
  ],
  accident_report: [
    { field_key: 'accident_date', value: '2026-01-15' },
    { field_key: 'vehicle_registration', value: 'SAMPLE 00 GP' },
  ],
  hospital_medical_report: [
    { field_key: 'full_name', value: 'SAMPLE Claimant' },
    { field_key: 'admission_date', value: '2026-01-15' },
    { field_key: 'treating_facility', value: 'SAMPLE Hospital' },
    { field_key: 'diagnosis', value: 'SAMPLE diagnosis' },
  ],
  serious_injury_assessment: [{ field_key: 'diagnosis', value: 'SAMPLE assessment' }],
  proof_of_earnings: [{ field_key: 'full_name', value: 'SAMPLE Claimant' }],
};

/** What the claim says, so that an ordinary upload agrees with it (Section 18 #60). */
export type MockClaimDetails = { claimantName?: string; idNumber?: string | null; dateOfBirth?: string | null; accidentDate?: string | null };

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export class MockOcrProvider implements OcrProvider {
  constructor(private readonly claim: MockClaimDetails = {}) {}

  private valueFor(key: string, fixture: string, filename: string): string {
    const { claimantName, idNumber, dateOfBirth, accidentDate } = this.claim;
    if (key === 'full_name') return filename.includes('IDENTITY_CONFLICT') ? 'SAMPLE Different Person' : (claimantName ?? fixture);
    if (key === 'id_number') return idNumber ?? fixture;
    if (key === 'date_of_birth') return dateOfBirth ?? fixture;
    if (key === 'accident_date') return accidentDate ?? fixture;
    if (key === 'admission_date') return accidentDate ? (filename.includes('DATE_CONFLICT') ? addDays(accidentDate, 9) : accidentDate) : fixture;
    return fixture;
  }

  extract({ filename, category }: OcrInput): Promise<OcrResult> {
    if (filename.includes('FAILURE')) return Promise.resolve({ ok: false, error: 'Mock extraction failure' });
    const confidence = filename.includes('LOW_CONFIDENCE') ? 0.55 : 0.95;
    const fields = (FIXTURES[category] ?? []).map((field) => ({ ...field, value: this.valueFor(field.field_key, field.value, filename), confidence, source_page: 1 }));
    return Promise.resolve({ ok: true, text: 'SAMPLE fictional extracted text', fields });
  }
}
