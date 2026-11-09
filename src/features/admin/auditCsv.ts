import type { AuditRow } from './api';

const HEADER = ['Time', 'Actor', 'Role', 'Event', 'Resource', 'Outcome', 'Reason', 'Session'];

function cell(value: string | null): string {
  const text = value ?? '';
  // A leading =, +, - or @ would run as a formula when the file is opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) || safe !== text ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function auditToCsv(rows: AuditRow[]): string {
  const lines = rows.map((row) => [row.created_at, row.actor_name, row.actor_role, row.action, row.resource_type, row.outcome, row.reason, row.session_ref].map(cell).join(','));
  return [HEADER.join(','), ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
