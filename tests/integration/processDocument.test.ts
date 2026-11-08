import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';
import { pdfBytes } from './documentHelpers';

const LAWYER = '00000000-0000-4000-8000-000000000003';
const admin = adminClient();
const endpoint = () => `${process.env.VITE_SUPABASE_URL}/functions/v1/process-document`;

async function confirmedVersion(filename: string, category = 'hospital_medical_report') {
  const lawyer = await signedIn('lawyer.demo@example.com');
  const { id: claimId } = await createClaim(lawyer, CLIENT_NOMSA);
  const documentId = randomUUID();
  const versionId = randomUUID();
  const path = `claims/${claimId}/${documentId}/v1/${filename}`;
  const bytes = pdfBytes(filename);
  await admin.from('documents').insert({ id: documentId, claim_id: claimId, category_key: category, uploaded_by: LAWYER });
  await admin.from('document_versions').insert({ id: versionId, document_id: documentId, version: 1, storage_path: path, filename, mime_type: 'application/pdf', size_bytes: bytes.length, confirmed: true, uploaded_by: LAWYER });
  await admin.storage.from('claim-documents').upload(path, bytes, { contentType: 'application/pdf' });
  return { documentId, versionId };
}

const call = (versionId: string, key: string) =>
  fetch(endpoint(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ version_id: versionId }) });

describe('process-document', () => {
  it('T-INT-1 stores sha256, an extraction and fields with confidence and source page', async () => {
    const { documentId, versionId } = await confirmedVersion('hospital_SAMPLE.pdf');
    expect((await call(versionId, process.env.SUPABASE_SERVICE_ROLE_KEY!)).status).toBe(200);
    const { data: version } = await admin.from('document_versions').select('sha256').eq('id', versionId).single();
    expect(version!.sha256).toMatch(/^[0-9a-f]{64}$/);
    const { data: document } = await admin.from('documents').select('processing_status').eq('id', documentId).single();
    expect(document).toEqual({ processing_status: 'processed' });
    const { data: extraction } = await admin.from('document_extractions').select('provider, status, extracted_fields(field_key, confidence, source_page, validation_status)').eq('document_version_id', versionId).single();
    expect(extraction).toMatchObject({ provider: 'mock', status: 'succeeded' });
    const fields = (extraction as unknown as { extracted_fields: Array<{ confidence: number; source_page: number; validation_status: string }> }).extracted_fields;
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field.confidence).toBeGreaterThan(0);
      expect(field.source_page).toBeGreaterThanOrEqual(1);
      expect(field.validation_status).toBe('suggested');
    }
  });

  it('T-INT-1 the low-confidence fixture returns confidence below 0.70', async () => {
    const { versionId } = await confirmedVersion('LOW_CONFIDENCE_SAMPLE.pdf');
    await call(versionId, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await admin.from('document_extractions').select('extracted_fields(confidence)').eq('document_version_id', versionId).single();
    const fields = (data as unknown as { extracted_fields: Array<{ confidence: number }> }).extracted_fields;
    expect(Math.min(...fields.map((field) => field.confidence))).toBeLessThan(0.7);
  });

  it('T-INT-4 a call without the service role is rejected and changes nothing', async () => {
    const { documentId, versionId } = await confirmedVersion('hospital_SAMPLE.pdf');
    expect((await call(versionId, process.env.VITE_SUPABASE_ANON_KEY!)).status).toBe(401);
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { data: session } = await lawyer.auth.getSession();
    expect((await call(versionId, session.session!.access_token)).status).toBe(401);
    const { data } = await admin.from('documents').select('processing_status').eq('id', documentId).single();
    expect(data).toEqual({ processing_status: 'uploaded' });
  });

  it('T-EDGE-5 an unconfirmed version is refused', async () => {
    const { versionId } = await confirmedVersion('hospital_SAMPLE.pdf');
    await admin.from('document_versions').update({ confirmed: false }).eq('id', versionId);
    expect((await call(versionId, process.env.SUPABASE_SERVICE_ROLE_KEY!)).status).toBe(409);
  });
});
