/** BR3: the fields required to leave Draft (Section 18 #3). */
export const REQUIRED_CLAIM_FIELDS = ['claimant_id', 'accident_date', 'accident_province', 'claimant_role', 'accident_description'] as const;

export type RequiredClaimField = (typeof REQUIRED_CLAIM_FIELDS)[number];

export const REQUIRED_FIELD_LABELS: Record<RequiredClaimField, string> = {
  claimant_id: 'Claimant',
  accident_date: 'Accident date',
  accident_province: 'Accident province',
  claimant_role: 'Claimant role',
  accident_description: 'Accident description',
};

export function missingRequiredFields(claim: Partial<Record<RequiredClaimField, string | null>>): RequiredClaimField[] {
  return REQUIRED_CLAIM_FIELDS.filter((field) => !claim[field]?.trim());
}
