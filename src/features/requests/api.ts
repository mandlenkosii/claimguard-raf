import { supabase } from '@/lib/supabase';

type LinkedIssue = { title: string; rule_id: string } | null;

export type RequestRow = {
  id: string;
  title: string;
  description: string;
  recipient_type: string;
  status: string;
  due_date: string | null;
  created_at: string;
  requests_documents: boolean;
  linked_issue: LinkedIssue;
};
export type LinkableIssue = { id: string; title: string; rule_id: string };
export type NewRequest = { claimId: string; title: string; description: string; recipientType: string; linkedIssueId: string | null; dueDate: string | null; requestsDocuments: boolean };
export type RequestDetail = {
  request: {
    id: string;
    claim_id: string;
    claim_reference: string;
    title: string;
    description: string;
    recipient_type: string;
    requests_documents: boolean;
    due_date: string | null;
    status: string;
    created_at: string;
    closed_at: string | null;
    creator_name: string;
    linked_issue: LinkedIssue;
  };
  responses: Array<{ id: string; body: string; author_name: string; author_role: string | null; created_at: string; documents: Array<{ id: string; filename: string }> }>;
  history: Array<{ from_status: string | null; to_status: string; actor_name: string; created_at: string }>;
  can_respond: boolean;
  can_review: boolean;
};

/** OP35. */
export async function getRequests(claimId: string): Promise<RequestRow[]> {
  const { data, error } = await supabase
    .from('information_requests')
    .select('id, title, description, recipient_type, status, due_date, created_at, requests_documents, linked_issue:claim_issues(title, rule_id)')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as RequestRow[];
}

export async function getLinkableIssues(claimId: string): Promise<LinkableIssue[]> {
  const { data, error } = await supabase.from('claim_issues').select('id, title, rule_id').eq('claim_id', claimId).in('status', ['open', 'under_review']).order('created_at');
  if (error) throw error;
  return data as LinkableIssue[];
}

/** OP32. */
export async function createRequest(input: NewRequest): Promise<string> {
  const { data, error } = await supabase.rpc('create_information_request', {
    p_claim: input.claimId,
    p_title: input.title,
    p_description: input.description,
    p_recipient_type: input.recipientType,
    p_linked_issue: input.linkedIssueId,
    p_requests_documents: input.requestsDocuments,
    p_due_date: input.dueDate,
  });
  if (error) throw error;
  return data as string;
}

export async function getRequestDetail(requestId: string): Promise<RequestDetail> {
  const { data, error } = await supabase.rpc('get_request_detail', { p_request: requestId });
  if (error) throw error;
  return data as RequestDetail;
}

/** OP33. */
export async function respondToRequest({ requestId, body, documentIds }: { requestId: string; body: string; documentIds: string[] }): Promise<void> {
  const { error } = await supabase.rpc('respond_to_request', { p_request: requestId, p_body: body, p_document_ids: documentIds });
  if (error) throw error;
}

/** OP34. */
export async function updateRequestStatus({ requestId, status }: { requestId: string; status: string }): Promise<void> {
  const { error } = await supabase.rpc('update_request_status', { p_request: requestId, p_status: status });
  if (error) throw error;
}
