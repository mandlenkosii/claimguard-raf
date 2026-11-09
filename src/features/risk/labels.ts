export const OUTCOME_LABELS: Record<string, string> = {
  no_issue_explained: 'No issue / explained',
  extraction_error_corrected: 'Extraction error corrected',
  discrepancy_confirmed_referred: 'Discrepancy confirmed and referred',
  escalated_senior: 'Escalated to a senior reviewer',
};

export const INDICATOR_LABELS: Record<string, string> = {
  identity_mismatch: 'Identity mismatch',
  date_inconsistency: 'Date inconsistency',
  duplicate_hash: 'Duplicate file',
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full name',
  id_number: 'ID number',
  date_of_birth: 'Date of birth',
  accident_date: 'Accident date',
  admission_date: 'Admission date',
  file: 'File',
};
