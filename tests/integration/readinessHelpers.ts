import { randomUUID } from 'node:crypto';
import { adminClient } from './helpers';
import { pdfBytes } from './documentHelpers';

const OFFICER = '00000000-0000-4000-8000-000000000005';
const admin = adminClient();

export const ALL_REQUIRED = ['identity_document', 'accident_report', 'hospital_medical_report', 'serious_injury_assessment'];

/** Adds a confirmed file and runs the real server processing. It bypasses the per-user upload limit. */
export async function addProcessedDocument(claimId: string, category: string, filename = `${category}_SAMPLE.pdf`, bytes: Uint8Array = pdfBytes(filename)) {
  const documentId = randomUUID();
  const versionId = randomUUID();
  const path = `claims/${claimId}/${documentId}/v1/${filename}`;
  await admin.from('documents').insert({ id: documentId, claim_id: claimId, category_key: category, uploaded_by: OFFICER });
  await admin.from('document_versions').insert({ id: versionId, document_id: documentId, version: 1, storage_path: path, filename, mime_type: 'application/pdf', size_bytes: bytes.length, confirmed: true, uploaded_by: OFFICER });
  await admin.storage.from('claim-documents').upload(path, bytes, { contentType: 'application/pdf' });
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/process-document`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ version_id: versionId }),
  });
  if (!response.ok) throw new Error(`process-document returned ${response.status}`);
  return { documentId, versionId };
}

export const openIssues = async (claimId: string) => (await admin.from('claim_issues').select('*').eq('claim_id', claimId).in('status', ['open', 'under_review'])).data!;
export const allIssues = async (claimId: string) => (await admin.from('claim_issues').select('*').eq('claim_id', claimId)).data!;
export const assessments = async (claimId: string) => (await admin.from('readiness_assessments').select('*').eq('claim_id', claimId).order('assessed_at', { ascending: false })).data!;
