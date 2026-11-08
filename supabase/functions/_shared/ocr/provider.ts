/** PRD 11.3: the extraction service sits behind this interface. Only the mock exists in this build. */
export type ExtractedFieldKey = 'full_name' | 'id_number' | 'date_of_birth' | 'accident_date' | 'admission_date' | 'treating_facility' | 'diagnosis' | 'vehicle_registration' | 'claim_reference';

export type ExtractedField = { field_key: ExtractedFieldKey; value: string; confidence: number; source_page: number };

export type OcrResult = { ok: true; text: string; fields: ExtractedField[] } | { ok: false; error: string };

export type OcrInput = { filename: string; category: string; bytes: Uint8Array };

export interface OcrProvider {
  extract(input: OcrInput): Promise<OcrResult>;
}
