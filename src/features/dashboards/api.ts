import { supabase } from '@/lib/supabase';

export type Metrics = {
  claims_total: number;
  by_status: Record<string, number>;
  ready_claims: number;
  average_readiness: number | null;
  blocking_issues: number;
  open_requests: number;
  overdue_requests: number;
  awaiting_review: number;
  open_alerts: number | null;
};
export type WorkItem = {
  kind: 'issue' | 'request';
  id: string;
  title: string;
  claim_id: string;
  claim_reference: string;
  claimant_name: string;
  due_date: string | null;
  status: string;
  impact: string | null;
  rule_id: string | null;
  column: 'todo' | 'in_progress' | 'waiting';
};
export type ClaimantHome = {
  claim: { id: string; reference: string; status: string; readiness_score: number | null; blocking_count: number } | null;
  open_requests: Array<{ id: string; title: string; due_date: string | null; status: string }>;
  recent_messages: Array<{ id: string; body: string; author_name: string; author_role: string | null; created_at: string }>;
  recent_activity: Array<{ id: string; summary: string; created_at: string }>;
};

/** OP39. */
export async function getMetrics(role: string): Promise<Metrics> {
  const { data, error } = await supabase.rpc('get_dashboard_metrics', { p_role: role });
  if (error) throw error;
  return data as Metrics;
}

/** OP40. */
export async function getOutstandingWork(role: string): Promise<WorkItem[]> {
  const { data, error } = await supabase.rpc('get_outstanding_work', { p_role: role });
  if (error) throw error;
  return data as WorkItem[];
}

export async function getClaimantHome(): Promise<ClaimantHome> {
  const { data, error } = await supabase.rpc('get_claimant_home');
  if (error) throw error;
  return data as ClaimantHome;
}
