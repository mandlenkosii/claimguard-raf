/** BR29 (Section 18 #14): PDF, JPG and PNG up to 10 MB, checked in the app and on the server. */
export const MAX_FILE_BYTES = 10485760;

const TYPES_BY_EXTENSION: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export const ACCEPTED_EXTENSIONS = Object.keys(TYPES_BY_EXTENSION).map((extension) => `.${extension}`);

export type FileCheck = { ok: true } | { ok: false; code: 'type'; extension: string } | { ok: false; code: 'too_large' } | { ok: false; code: 'empty' };

export function validateFile(file: { name: string; type: string; size: number }): FileCheck {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (TYPES_BY_EXTENSION[extension] !== file.type) return { ok: false, code: 'type', extension };
  if (file.size === 0) return { ok: false, code: 'empty' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, code: 'too_large' };
  return { ok: true };
}
