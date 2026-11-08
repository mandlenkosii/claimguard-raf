import type { ExtractedField, OcrInput, OcrProvider, OcrResult } from './provider.ts';

// Fictional fixtures keyed by document category. A file name containing FAILURE or LOW_CONFIDENCE
// selects the failure and low-confidence fixtures.
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

export class MockOcrProvider implements OcrProvider {
  extract({ filename, category }: OcrInput): Promise<OcrResult> {
    if (filename.includes('FAILURE')) return Promise.resolve({ ok: false, error: 'Mock extraction failure' });
    const confidence = filename.includes('LOW_CONFIDENCE') ? 0.55 : 0.95;
    const fields = (FIXTURES[category] ?? []).map((field) => ({ ...field, confidence, source_page: 1 }));
    return Promise.resolve({ ok: true, text: 'SAMPLE fictional extracted text', fields });
  }
}
