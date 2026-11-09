import { supabase } from '@/lib/supabase';
import type { CategoryKey } from './categories';

export type Evidence = { source: string; field: string; value?: string; document_id?: string; version_id?: string; field_id?: string };

export type ClaimIssue = {
  id: string;
  rule_id: string;
  issue_key: string;
  title: string;
  explanation: string;
  corrective_action: string;
  impact: 'blocking' | 'warning';
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  dismiss_reason: string | null;
  classification: 'extraction_error' | 'genuine_discrepancy' | null;
  evidence: Evidence[];
};

export type Assessment = {
  score: number;
  rules_version: string;
  assessed_at: string;
  blocking_count: number;
  warning_count: number;
  resolved_count: number;
  category_scores: Record<CategoryKey, number>;
};

export type Readiness = { assessment: Assessment | null; issues: ClaimIssue[]; weights: Record<CategoryKey, number>; stale: boolean };

export type IssueUpdate = { issueId: string; status?: 'under_review' | 'resolved' | 'dismissed' | 'open'; reason?: string; classification?: 'extraction_error' | 'genuine_discrepancy' };

/** OP26. */
export async function getReadiness(claimId: string): Promise<Readiness> {
  const [assessment, issues, settings, claim] = await Promise.all([
    supabase.from('readiness_assessments').select('score, rules_version, assessed_at, blocking_count, warning_count, resolved_count, category_scores').eq('claim_id', claimId).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('claim_issues').select('id, rule_id, issue_key, title, explanation, corrective_action, impact, status, dismiss_reason, classification, evidence').eq('claim_id', claimId).order('created_at'),
    supabase.from('readiness_settings').select('weight_documentation, weight_required_information, weight_identity, weight_timeline, weight_cross_document').single(),
    supabase.from('claims').select('readiness_stale').eq('id', claimId).single(),
  ]);
  const failure = assessment.error ?? issues.error ?? settings.error ?? claim.error;
  if (failure) throw failure;
  return {
    assessment: assessment.data as Assessment | null,
    issues: issues.data as ClaimIssue[],
    weights: {
      documentation: settings.data!.weight_documentation,
      required_information: settings.data!.weight_required_information,
      identity: settings.data!.weight_identity,
      timeline: settings.data!.weight_timeline,
      cross_document: settings.data!.weight_cross_document,
    },
    stale: claim.data!.readiness_stale,
  };
}

/** OP24. */
export async function runReadiness(claimId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('run-readiness', { body: { claim_id: claimId } });
  if (error) throw error;
}

/** OP25. */
export async function updateIssue({ issueId, status, reason, classification }: IssueUpdate): Promise<void> {
  const { error } = await supabase.rpc('update_issue_status', { p_issue: issueId, p_status: status ?? null, p_reason: reason ?? null, p_classification: classification ?? null });
  if (error) throw error;
}
