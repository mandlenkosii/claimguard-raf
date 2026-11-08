import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const pdfBytes = (marker: string) => new TextEncoder().encode(`%PDF-1.4\n% SAMPLE fictional ${marker} ${randomUUID()}\n`);

/** OP19 through the same calls the app makes: document row, version row, then storage. */
export async function startUpload(client: SupabaseClient, claimId: string, userId: string, filename = 'identity_SAMPLE.pdf', category = 'identity_document') {
  const documentId = randomUUID();
  const versionId = randomUUID();
  const storagePath = `claims/${claimId}/${documentId}/v1/${filename}`;
  const bytes = pdfBytes(filename);
  const doc = await client.from('documents').insert({ id: documentId, claim_id: claimId, category_key: category, uploaded_by: userId });
  if (doc.error) return { documentId, versionId, storagePath, error: doc.error };
  const version = await client.from('document_versions').insert({ id: versionId, document_id: documentId, version: 1, storage_path: storagePath, filename, mime_type: 'application/pdf', size_bytes: bytes.length, uploaded_by: userId });
  if (version.error) return { documentId, versionId, storagePath, error: version.error };
  const upload = await client.storage.from('claim-documents').upload(storagePath, bytes, { contentType: 'application/pdf' });
  return { documentId, versionId, storagePath, error: upload.error };
}

export async function waitForStatus(client: SupabaseClient, documentId: string, wanted: string[], timeoutMs = 30000) {
  const started = Date.now();
  let status = '';
  while (Date.now() - started < timeoutMs) {
    const { data } = await client.from('documents').select('processing_status').eq('id', documentId).single();
    status = data?.processing_status ?? '';
    if (wanted.includes(status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return status;
}
