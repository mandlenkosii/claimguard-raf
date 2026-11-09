import { supabase } from '@/lib/supabase';

export type AdminUser = { id: string; name: string; email: string; account_status: string; roles: string[]; organisation: string | null; last_sign_in_at: string | null; mfa: boolean };
export type UserFilters = { role: string; organisation: string; status: string; search: string };
export type UserList = { rows: AdminUser[]; total: number; counts: { active: number; invited: number; suspended: number; disabled: number } };
export type Organisation = { id: string; name: string; type: string; registration_number: string | null; status: string };
export type OrganisationInput = { id: string | null; name: string; type: string; registrationNumber: string | null; status: string };
export type Invite = { email: string; firstName: string; surname: string; roles: string[]; organisationId: string | null; reason: string };
export type PermissionMatrixData = { permissions: Array<{ key: string; description: string }>; grants: Array<{ role_key: string; permission_key: string; scope: string }> };
export type AuditRow = { id: number; created_at: string; actor_name: string | null; actor_role: string | null; action: string; resource_type: string; resource_id: string | null; outcome: string; change_summary: Record<string, unknown>; reason: string | null; session_ref: string | null };
export type AuditFilters = { claimId?: string; actorRole: string; category: string; outcome: string; from: string; to: string };
export type AuditPage = { rows: AuditRow[]; total: number; counts: { total: number; denied: number } };
export type HealthStatus = 'Operational' | 'Degraded' | 'Down';
export type HealthResult = { service: string; status: HealthStatus };

/** OP41. */
export async function listUsers(filters: UserFilters, page: number, pageSize: number): Promise<UserList> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_role: filters.role || null,
    p_organisation: filters.organisation || null,
    p_status: filters.status || null,
    p_search: filters.search || null,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  return data as UserList;
}

/** OP42. */
export async function inviteUser(input: Invite): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-invite-user', {
    body: { email: input.email, first_name: input.firstName, surname: input.surname, roles: input.roles, organisation_id: input.organisationId, reason: input.reason },
  });
  if (error) throw error;
}

/** OP43. */
export async function setUserRoles({ userId, roles, reason }: { userId: string; roles: string[]; reason: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_roles', { p_user: userId, p_roles: roles, p_reason: reason });
  if (error) throw error;
}

/** OP44. */
export async function setAccountStatus({ userId, status, reason }: { userId: string; status: string; reason: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_set_account_status', { p_user: userId, p_status: status, p_reason: reason });
  if (error) throw error;
}

/** Fictional @example.com addresses cannot receive mail, so nothing is sent to them. */
export async function sendPasswordReset(email: string): Promise<void> {
  if (email.endsWith('@example.com')) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw error;
}

/** OP45. */
export async function getPermissionMatrix(): Promise<PermissionMatrixData> {
  const [permissions, grants] = await Promise.all([supabase.from('permissions').select('key, description').order('key'), supabase.from('role_permissions').select('role_key, permission_key, scope')]);
  if (permissions.error) throw permissions.error;
  if (grants.error) throw grants.error;
  return { permissions: permissions.data, grants: grants.data };
}

/** OP46, OP47. */
export async function getAuditLog(filters: AuditFilters, page: number, pageSize: number): Promise<AuditPage> {
  const { data, error } = await supabase.rpc('get_audit_log', {
    p_claim: filters.claimId ?? null,
    p_actor_role: filters.actorRole || null,
    p_category: filters.category || null,
    p_outcome: filters.outcome || null,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  return data as AuditPage;
}

/** OP48. */
export async function getOrganisations(): Promise<Organisation[]> {
  const { data, error } = await supabase.from('organisations').select('id, name, type, registration_number, status').order('name');
  if (error) throw error;
  return data as Organisation[];
}

export async function saveOrganisation({ id, name, type, registrationNumber, status }: OrganisationInput): Promise<void> {
  const fields = { name, type, registration_number: registrationNumber, status };
  const { error } = id ? await supabase.from('organisations').update(fields).eq('id', id) : await supabase.from('organisations').insert(fields);
  if (error) throw error;
}

const SLOW_MS = 2000;

async function timed(service: string, check: () => Promise<boolean>): Promise<HealthResult> {
  const started = performance.now();
  try {
    if (!(await check())) return { service, status: 'Down' };
    return { service, status: performance.now() - started > SLOW_MS ? 'Degraded' : 'Operational' };
  } catch {
    return { service, status: 'Down' };
  }
}

const functionUrl = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

/** OP49: browser checks, shown as demonstration data (Section 18 #28). */
export function checkHealth(): Promise<HealthResult[]> {
  return Promise.all([
    timed('Auth', async () => !(await supabase.auth.getSession()).error),
    timed('Database', async () => !(await supabase.rpc('health_check')).error),
    timed('Storage', async () => !(await supabase.storage.from('claim-documents').list('', { limit: 1 })).error),
    timed('Edge Functions', async () => (await fetch(functionUrl('run-readiness'), { method: 'OPTIONS' })).ok),
    // The mock runs inside process-document, which allows no browser calls: reaching it is the check.
    timed('Mock OCR provider', async () => {
      await fetch(functionUrl('process-document'), { method: 'POST', mode: 'no-cors' });
      return true;
    }),
  ]);
}
