import { supabase } from '@/lib/supabase';

export type DocumentCategory = { key: string; name: string; is_required: boolean };

export type ClaimDocumentRow = {
  document_id: string;
  version_id: string;
  category_key: string;
  category_name: string;
  filename: string;
  uploader_name: string;
  uploaded_at: string;
  processing_status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'review_required';
  processing_error: string | null;
  storage_path: string;
};

export type UploadInput = { claimId: string; category: string; file: File; onProgress: (percent: number) => void };

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const { data, error } = await supabase.from('document_categories').select('key, name, is_required').order('name');
  if (error) throw error;
  return data as DocumentCategory[];
}

export async function getClaimDocuments(claimId: string): Promise<ClaimDocumentRow[]> {
  const { data, error } = await supabase.rpc('get_claim_documents', { p_claim: claimId });
  if (error) throw error;
  return data as ClaimDocumentRow[];
}

function sendFile(path: string, file: File, token: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    request.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/claim-documents/${encoded}`);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => (request.status < 300 ? resolve() : reject(new Error(`Upload failed (${request.status})`)));
    request.onerror = () => reject(new Error('Upload failed'));
    request.send(file);
  });
}

/** OP19: the file goes straight to private storage. It only counts once OP20 confirms it. */
export async function uploadDocument({ claimId, category, file, onProgress }: UploadInput): Promise<{ documentId: string; versionId: string }> {
  const { data: auth } = await supabase.auth.getSession();
  const session = auth.session;
  if (!session) throw new Error('Not signed in');

  const documentId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.-]/g, '_');
  const storagePath = `claims/${claimId}/${documentId}/v1/${safeName}`;

  const document = await supabase.from('documents').insert({ id: documentId, claim_id: claimId, category_key: category, uploaded_by: session.user.id });
  if (document.error) throw document.error;
  const version = await supabase.from('document_versions').insert({ id: versionId, document_id: documentId, version: 1, storage_path: storagePath, filename: file.name, mime_type: file.type, size_bytes: file.size, uploaded_by: session.user.id });
  if (version.error) throw version.error;

  await sendFile(storagePath, file, session.access_token, onProgress);
  return { documentId, versionId };
}

/** OP20. */
export async function confirmUpload(versionId: string): Promise<{ ok: boolean; code?: 'error' | 'rate_limited' }> {
  const { data, error } = await supabase.rpc('confirm_document_upload', { p_version: versionId });
  if (error) throw error;
  return data as { ok: boolean; code?: 'error' | 'rate_limited' };
}

/** OP22. */
export async function retryProcessing(documentId: string): Promise<void> {
  const { error } = await supabase.rpc('retry_document_processing', { p_document: documentId });
  if (error) throw error;
}

export async function sendToManualReview(documentId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_document_manual_review', { p_document: documentId });
  if (error) throw error;
}

/** OP23: requested at the moment of download; the link lasts 5 minutes (BR27). */
export async function getDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('claim-documents').createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}
