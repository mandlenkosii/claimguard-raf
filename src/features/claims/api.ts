import { supabase } from '@/lib/supabase';

export type Page<T> = { rows: T[]; total: number };

export type ClaimListRow = {
  id: string;
  reference: string;
  claimant_name: string | null;
  accident_date: string | null;
  status: string;
  readiness_score: number | null;
  blocking_count: number | null;
  open_request_count: number | null;
  updated_at: string;
};

export type ClaimFields = Partial<Record<'claimant_role' | 'accident_date' | 'accident_time' | 'accident_province' | 'accident_town' | 'accident_location' | 'police_station' | 'cas_number' | 'accident_description' | 'injuries_summary', string | null>>;

export type ClaimParty = { id: string; party_type: string; full_name: string | null };

export type ClaimDetail = {
  id: string;
  reference: string;
  status: string;
  claimant_name: string;
  claimant_id: string;
  claimant_role: string | null;
  accident_date: string | null;
  accident_time: string | null;
  accident_province: string | null;
  accident_town: string | null;
  accident_location: string | null;
  police_station: string | null;
  cas_number: string | null;
  accident_description: string | null;
  injuries_summary: string | null;
  created_at: string;
  readiness_score: number | null;
  blocking_count: number | null;
  parties: ClaimParty[];
};

export type ClaimSummary = {
  id: string;
  reference: string;
  status: string;
  readiness_score: number | null;
  blocking_count: number | null;
  warning_count: number | null;
  open_request_count: number;
  assignment_count: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type Assignment = { profile_id: string; display_name: string; assignment_role: string; assigned_at: string };

export type TimelineEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  summary: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  created_at: string;
};

export type ClientRow = {
  claimant_id: string;
  full_name: string;
  id_number: string | null;
  email: string | null;
  mobile: string | null;
  mandate_status: 'on_file' | 'pending';
  assigned_lawyer_id: string | null;
  claim_count: number;
};

export type QueueRow = {
  id: string;
  reference: string;
  claimant_name: string;
  legal_representative: string | null;
  status: string;
  readiness_score: number | null;
  blocking_count: number | null;
  risk_flag: string | null;
  open_request_count: number;
  days_in_stage: number;
};

export type NewClientInput = { firstName: string; surname: string; idNumber: string; dateOfBirth: string; email: string; mobile: string; assignedLawyer: string; mandateStatus: 'on_file' | 'pending' };

const LIST_COLUMNS = 'id, reference, claimant_name, accident_date, status, readiness_score, blocking_count, open_request_count, updated_at';

/** OP11: one page at a time. */
export async function listClaims({ page, pageSize }: { page: number; pageSize: number }): Promise<Page<ClaimListRow>> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase.from('claims_list').select(LIST_COLUMNS, { count: 'exact' }).order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: data as ClaimListRow[], total: count ?? 0 };
}

export async function getClaimsQueue(tab: 'assigned' | 'team' | 'unassigned', page: number, pageSize: number): Promise<Page<QueueRow>> {
  const { data, error } = await supabase.rpc('claims_queue', { p_tab: tab, p_page: page, p_page_size: pageSize });
  if (error) throw error;
  return data as Page<QueueRow>;
}

/** OP9. */
export async function createClaim(input: { claimantId: string | null; fields: ClaimFields }): Promise<{ id: string; reference: string }> {
  const { data, error } = await supabase.rpc('create_claim', { p_claimant_id: input.claimantId, p_fields: input.fields });
  if (error) throw error;
  return data as { id: string; reference: string };
}

/** OP10. */
export async function updateClaim(id: string, fields: ClaimFields): Promise<void> {
  const { error } = await supabase.from('claims').update(fields).eq('id', id);
  if (error) throw error;
}

/** S11 steps 4 and 5. Returns the row id, so later saves update the same row. */
export async function saveVehicle(claimId: string, id: string | null, values: { registration_number: string | null; make_model: string | null }): Promise<string> {
  if (id) {
    const { error } = await supabase.from('claim_vehicles').update(values).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from('claim_vehicles').insert({ claim_id: claimId, ...values }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function saveOtherParty(claimId: string, id: string | null, fullName: string | null): Promise<string> {
  if (id) {
    const { error } = await supabase.from('claim_parties').update({ full_name: fullName }).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from('claim_parties').insert({ claim_id: claimId, party_type: 'other_party', full_name: fullName }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

/** OP12. Null when the signed-in user has no access. */
export async function getClaim(id: string): Promise<ClaimDetail | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, reference, status, claimant_id, claimant_role, accident_date, accident_time, accident_province, accident_town, accident_location, police_station, cas_number, accident_description, injuries_summary, created_at, claimants(first_name, surname), claim_parties(id, party_type, full_name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: list } = await supabase.from('claims_list').select('readiness_score, blocking_count').eq('id', id).maybeSingle();
  const { claimants, claim_parties: parties, ...claim } = data as unknown as Omit<ClaimDetail, 'claimant_name' | 'parties' | 'readiness_score' | 'blocking_count'> & {
    claimants: { first_name: string; surname: string };
    claim_parties: ClaimParty[];
  };
  return {
    ...claim,
    claimant_name: `${claimants.first_name} ${claimants.surname}`,
    parties,
    readiness_score: list?.readiness_score ?? null,
    blocking_count: list?.blocking_count ?? null,
  };
}

export async function getClaimSummary(id: string): Promise<ClaimSummary | null> {
  const { data, error } = await supabase.from('claim_summaries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ClaimSummary | null;
}

export async function getAssignments(claimId: string): Promise<Assignment[]> {
  const { data, error } = await supabase.rpc('get_claim_assignments', { p_claim: claimId });
  if (error) throw error;
  return data as Assignment[];
}

/** OP16. Newest first; filters are applied on the screen. */
export async function getTimeline(claimId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase.rpc('get_claim_timeline', { p_claim: claimId });
  if (error) throw error;
  return data as TimelineEvent[];
}

type ClientQueryRow = {
  claimant_id: string;
  mandate_status: ClientRow['mandate_status'];
  assigned_lawyer_id: string | null;
  claimants: { first_name: string; surname: string; id_number: string | null; email: string | null; mobile: string | null; claims: Array<{ count: number }> };
};

const CLIENT_COLUMNS = 'claimant_id, mandate_status, assigned_lawyer_id, claimants!inner(first_name, surname, id_number, email, mobile, claims(count))';

function toClient(row: ClientQueryRow): ClientRow {
  return {
    claimant_id: row.claimant_id,
    full_name: `${row.claimants.first_name} ${row.claimants.surname}`,
    id_number: row.claimants.id_number,
    email: row.claimants.email,
    mobile: row.claimants.mobile,
    mandate_status: row.mandate_status,
    assigned_lawyer_id: row.assigned_lawyer_id,
    claim_count: row.claimants.claims[0]?.count ?? 0,
  };
}

/** OP17: RLS limits this to the lawyer's own firm. */
export async function listClients({ page, pageSize }: { page: number; pageSize: number }): Promise<Page<ClientRow>> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await supabase.from('client_relationships').select(CLIENT_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data as unknown as ClientQueryRow[]).map(toClient), total: count ?? 0 };
}

export async function getClient(claimantId: string): Promise<ClientRow | null> {
  const { data, error } = await supabase.from('client_relationships').select(CLIENT_COLUMNS).eq('claimant_id', claimantId).maybeSingle();
  if (error) throw error;
  return data ? toClient(data as unknown as ClientQueryRow) : null;
}

export async function getClientClaims(claimantId: string): Promise<ClaimListRow[]> {
  const { data: ids, error } = await supabase.from('claims').select('id').eq('claimant_id', claimantId);
  if (error) throw error;
  const { data, error: listError } = await supabase.from('claims_list').select(LIST_COLUMNS).in('id', ids.map((row) => row.id)).order('updated_at', { ascending: false });
  if (listError) throw listError;
  return data as ClaimListRow[];
}

export async function getFirmLawyers(): Promise<Array<{ profile_id: string; display_name: string }>> {
  const { data, error } = await supabase.rpc('get_firm_lawyers');
  if (error) throw error;
  return data as Array<{ profile_id: string; display_name: string }>;
}

/** OP18. */
export async function addClient(input: NewClientInput): Promise<string> {
  const { data, error } = await supabase.rpc('add_client', {
    p_first_name: input.firstName,
    p_surname: input.surname,
    p_id_number: input.idNumber,
    p_date_of_birth: input.dateOfBirth || null,
    p_email: input.email,
    p_mobile: input.mobile,
    p_assigned_lawyer: input.assignedLawyer || null,
    p_mandate_status: input.mandateStatus,
  });
  if (error) throw error;
  return data as string;
}
