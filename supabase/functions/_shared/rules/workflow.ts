/** The Must rows of Section 8.3 as (from, to, role). The SQL function workflow_matrix() must match (T-BR4-1). */
type Row = { from: string; to: string; role: string };

const rows = (from: string, to: string, roles: string[]): Row[] => roles.map((role) => ({ from, to, role }));

export const WORKFLOW_MATRIX: Row[] = [
  ...rows('draft', 'documents_needed', ['claimant', 'lawyer']),
  ...rows('documents_needed', 'validation', ['claimant', 'lawyer']),
  ...rows('validation', 'ready', ['claimant', 'lawyer', 'raf_officer']),
  ...rows('ready', 'submitted', ['claimant', 'lawyer']),
  ...rows('submitted', 'raf_review', ['raf_officer']),
  ...rows('raf_review', 'information_required', ['raf_officer']),
  ...rows('raf_review', 'assessment', ['raf_officer']),
  ...rows('information_required', 'raf_review', ['raf_officer']),
  ...rows('assessment', 'negotiation', ['raf_officer']),
  ...rows('negotiation', 'settlement', ['raf_officer']),
  ...rows('settlement', 'closed', ['raf_officer']),
];

/** Is this transition in the matrix for any of these roles? Claim-level checks are made on the server. */
export function canTransition(from: string, to: string, roles: readonly string[]): boolean {
  return WORKFLOW_MATRIX.some((row) => row.from === from && row.to === to && roles.includes(row.role));
}
