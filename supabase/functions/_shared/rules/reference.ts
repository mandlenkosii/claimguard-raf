/** BR1: CG-YYYY-NNNNNN. The server generates the real value; this formats it the same way. */
export function formatClaimReference(year: number, sequence: number): string {
  return `CG-${year}-${String(sequence).padStart(6, '0')}`;
}
