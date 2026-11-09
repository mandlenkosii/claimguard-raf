import { supabase } from '@/lib/supabase';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Filters = { severity: string; status: string; indicator: string; assignee: string; age: string };
export type QueueRow = {
  id: string;
  reference: string;
  claim_id: string;
  claim_reference: string;
  claimant_name: string;
  indicator_type: string;
  severity: string;
  status: string;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  age_days: number;
  can_open: boolean;
};
export type Queue = { rows: QueueRow[]; total: number; counts: Record<Severity, number> };
export type Investigator = { id: string; name: string };
export type AlertSummary = {
  id: string;
  reference: string;
  rule_id: string | null;
  rule_version: string | null;
  title: string;
  explanation: string;
  severity: string;
  status: string;
  indicator_type: string;
  created_at: string;
  assignee_name: string | null;
  evidence_count: number;
};
export type RiskFlag = { flag: string | null; outcome_label: string | null };
export type AlertEvidence = {
  id: string;
  description: string;
  source: string;
  field: string;
  value: string | null;
  document_id: string | null;
  version_id: string | null;
  filename: string | null;
  storage_path: string | null;
  mime_type: string | null;
  source_page: number | null;
};
export type AlertNote = { id: string; body: string; author_name: string; author_role: string | null; corrects_note_id: string | null; created_at: string };
export type AlertReview = { outcome: string; finding_summary: string; rationale: string; next_action: string; next_action_due: string | null; resulting_status: string; recorder_name: string; recorded_at: string };
export type AlertHistoryRow = { id: string; change_type: string; old_value: string | null; new_value: string | null; actor_name: string | null; reason: string | null; created_at: string };
export type AlertWorkspace = {
  alert: { id: string; reference: string; title: string; explanation: string; severity: string; status: string; indicator_type: string; created_at: string; assigned_to: string | null; assignee_name: string | null };
  claim: { id: string; reference: string; status: string; claimant_name: string };
  rule: { id: string; name: string; version: string } | null;
  evidence: AlertEvidence[];
  documents: Array<{ id: string; filename: string; category_name: string }>;
  issues: Array<{ id: string; rule_id: string; title: string; status: string }>;
  history: AlertHistoryRow[];
  notes: AlertNote[];
  review: AlertReview | null;
  investigators: Investigator[];
  can_assign: boolean;
};
export type AlertUpdate = { alertId: string; assignedTo?: string; status?: string; severity?: string; reason?: string };
export type NoteInput = { alertId: string; body: string; correctsNoteId: string | null };
export type ReviewInput = {
  alertId: string;
  outcome: string;
  findingSummary: string;
  rationale: string;
  evidenceIds: string[];
  nextAction: string;
  nextActionDue: string | null;
  resultingStatus: string;
  confirmed: boolean;
};

/** OP27. */
export async function getRiskQueue(tab: string, filters: Filters, page: number, pageSize: number): Promise<Queue> {
  const { data, error } = await supabase.rpc('risk_queue', {
    p_tab: tab,
    p_severity: filters.severity || null,
    p_status: filters.status || null,
    p_indicator: filters.indicator || null,
    p_assignee: filters.assignee || null,
    p_min_age: filters.age ? Number(filters.age) : null,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  return data as Queue;
}

export async function getInvestigators(): Promise<Investigator[]> {
  const { data, error } = await supabase.rpc('get_investigators');
  if (error) throw error;
  return data as Investigator[];
}

export async function getClaimAlerts(claimId: string): Promise<AlertSummary[]> {
  const { data, error } = await supabase.rpc('get_claim_alerts', { p_claim: claimId });
  if (error) throw error;
  return data as AlertSummary[];
}

/** The limited view for officers and lawyers (SEC14). */
export async function getRiskFlag(claimId: string): Promise<RiskFlag | null> {
  const { data, error } = await supabase.from('claim_risk_flags').select('flag, outcome_label').eq('claim_id', claimId).maybeSingle();
  if (error) throw error;
  return data as RiskFlag | null;
}

/** OP28. */
export async function getAlertWorkspace(alertId: string): Promise<AlertWorkspace> {
  const { data, error } = await supabase.rpc('get_alert_workspace', { p_alert: alertId });
  if (error) throw error;
  return data as AlertWorkspace;
}

/** A SAMPLE file may have no stored copy, in which case the preview shows its details only. */
export async function getPreviewUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('claim-documents').createSignedUrl(storagePath, 300);
  return error ? null : data.signedUrl;
}

/** OP29. */
export async function updateAlert({ alertId, assignedTo, status, severity, reason }: AlertUpdate): Promise<void> {
  const { error } = await supabase.rpc('update_risk_alert', { p_alert: alertId, p_assigned_to: assignedTo ?? null, p_status: status ?? null, p_severity: severity ?? null, p_reason: reason ?? null });
  if (error) throw error;
}

/** OP30. */
export async function addNote({ alertId, body, correctsNoteId }: NoteInput): Promise<void> {
  const { error } = await supabase.from('investigation_notes').insert({ alert_id: alertId, body, corrects_note_id: correctsNoteId });
  if (error) throw error;
}

/** OP31. */
export async function recordReview(input: ReviewInput): Promise<void> {
  const { error } = await supabase.rpc('record_risk_review', {
    p_alert: input.alertId,
    p_outcome: input.outcome,
    p_finding_summary: input.findingSummary,
    p_rationale: input.rationale,
    p_evidence_ids: input.evidenceIds,
    p_next_action: input.nextAction,
    p_next_action_due: input.nextActionDue,
    p_resulting_status: input.resultingStatus,
    p_confirmed: input.confirmed,
  });
  if (error) throw error;
}
