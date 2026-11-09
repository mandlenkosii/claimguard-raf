import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient, createTestUser, deleteTestUser, signedIn } from './helpers';

const admin = adminClient();
const ADMIN = '00000000-0000-4000-8000-000000000008';
type Client = Awaited<ReturnType<typeof signedIn>>;
let adminUser: Client;
let target: { id: string; email: string; password: string };
const created: string[] = [];

beforeAll(async () => {
  adminUser = await signedIn('admin.demo@example.com');
  target = await createTestUser({ account_type: 'claimant', first_name: 'Admin', surname: 'Target', popia_consent: true });
  created.push(target.id);
});
afterAll(async () => {
  for (const id of created) await deleteTestUser(id).catch(() => undefined);
});

const setRoles = (client: Client, user: string, roles: string[], reason: string | null) => client.rpc('admin_set_user_roles', { p_user: user, p_roles: roles, p_reason: reason });
const setStatus = (client: Client, user: string, status: string, reason: string | null) => client.rpc('admin_set_account_status', { p_user: user, p_status: status, p_reason: reason });
const invite = (client: Client, email: string, roles: string[] = ['raf_officer']) =>
  client.functions.invoke('admin-invite-user', { body: { email, first_name: 'Invited', surname: 'Person', roles, organisation_id: null, reason: 'New starter' } });

describe('Administration', () => {
  it('T-US81-1 lists users with roles, organisation, status, last sign-in and MFA', async () => {
    await signedIn('manager.demo@example.com');
    const { data, error } = await adminUser.rpc('admin_list_users', { p_role: 'manager', p_status: 'active' });
    expect(error).toBeNull();
    expect(data.rows.find((row: { email: string }) => row.email === 'manager.demo@example.com')).toMatchObject({ account_status: 'active', roles: ['manager'], mfa: false });
    expect(data.counts.active).toBeGreaterThan(0);
    const { data: lawyers } = await adminUser.rpc('admin_list_users', { p_search: 'lawyer.demo@example.com' });
    expect(lawyers.rows[0].organisation).toBe('Nkosi & Partners Attorneys');
  });

  it('T-US82-1 a role change needs a reason, and is stored and audited with it', async () => {
    expect((await setRoles(adminUser, target.id, ['claimant', 'lawyer'], null)).error).not.toBeNull();
    expect((await setRoles(adminUser, target.id, ['claimant', 'lawyer'], 'Verified practitioner')).error).toBeNull();
    const { data: roles } = await admin.from('user_roles').select('role_key, assigned_by, reason').eq('user_id', target.id).eq('role_key', 'lawyer').single();
    expect(roles).toEqual({ role_key: 'lawyer', assigned_by: ADMIN, reason: 'Verified practitioner' });
    const { data: audit } = await admin.from('audit_logs').select('action, reason, actor_id').eq('resource_id', target.id).eq('action', 'ROLE_CHANGED').order('created_at', { ascending: false }).limit(1).single();
    expect(audit).toEqual({ action: 'ROLE_CHANGED', reason: 'Verified practitioner', actor_id: ADMIN });
  });

  it('T-US82-1 removing a role is audited too', async () => {
    expect((await setRoles(adminUser, target.id, ['claimant'], 'Role no longer needed')).error).toBeNull();
    expect((await admin.from('user_roles').select('role_key').eq('user_id', target.id)).data).toEqual([{ role_key: 'claimant' }]);
    const { data } = await admin.from('audit_logs').select('change_summary').eq('resource_id', target.id).eq('reason', 'Role no longer needed');
    expect(JSON.stringify(data)).toContain('lawyer');
  });

  it('T-US82-2 the server rejects an admin changing their own roles', async () => {
    const { error } = await setRoles(adminUser, ADMIN, ['admin', 'manager'], 'Self');
    expect(error?.code).toBe('42501');
    expect(error?.message).toBe('Admins cannot assign roles to themselves.');
  });

  it('T-US81-1 suspending blocks the user at once, and re-enabling restores access', async () => {
    const client = await signedIn(target.email, target.password);
    expect((await setStatus(adminUser, target.id, 'suspended', null)).error).not.toBeNull();
    expect((await setStatus(adminUser, target.id, 'suspended', 'Leave of absence')).error).toBeNull();
    expect((await client.from('profiles').select('id')).data).toEqual([]);
    const { data: audit } = await admin.from('audit_logs').select('reason').eq('resource_id', target.id).eq('action', 'ACCOUNT_STATUS_CHANGED').limit(1).single();
    expect(audit).toEqual({ reason: 'Leave of absence' });
    expect((await setStatus(adminUser, target.id, 'active', 'Back')).error).toBeNull();
    expect((await client.from('profiles').select('id')).data).toHaveLength(1);
  });

  it('T-US81-1 an admin cannot change their own account status', async () => {
    expect((await setStatus(adminUser, ADMIN, 'disabled', 'Oops')).error?.code).toBe('42501');
  });

  it('T-INT-3 admin-invite-user creates an invited user with roles', async () => {
    const email = `invited.${Date.now()}@example.com`;
    const { data, error } = await invite(adminUser, email);
    expect(error).toBeNull();
    created.push(data.user_id);
    const { data: profile } = await admin.from('profiles').select('account_status, account_type').eq('id', data.user_id).single();
    expect(profile).toEqual({ account_status: 'invited', account_type: 'staff' });
    expect((await admin.from('user_roles').select('role_key, assigned_by').eq('user_id', data.user_id)).data).toEqual([{ role_key: 'raf_officer', assigned_by: ADMIN }]);
    expect((await admin.from('audit_logs').select('action').eq('resource_id', data.user_id).eq('action', 'USER_INVITED')).data).toHaveLength(1);
  });

  it('T-INT-3 a non-admin call is rejected and creates nobody', async () => {
    const email = `blocked.${Date.now()}@example.com`;
    const { error } = await invite(await signedIn('officer.demo@example.com'), email);
    expect(error).not.toBeNull();
    expect((await admin.from('profiles').select('id').eq('email', email)).data).toEqual([]);
  });

  it('T-US85-1 administrators get no claim documents, evidence or notes', async () => {
    expect((await adminUser.from('documents').select('id')).data).toEqual([]);
    expect((await adminUser.from('risk_evidence').select('id')).data).toEqual([]);
    expect((await adminUser.from('investigation_notes').select('id')).data).toEqual([]);
    expect((await adminUser.rpc('get_alert_workspace', { p_alert: 'e0000000-0000-4000-8000-000000000001' })).error?.code).toBe('42501');
    expect((await adminUser.rpc('get_claim_documents', { p_claim: 'c0000000-0000-4000-8000-000000000003' })).data).toEqual([]);
  });

  it('T-EDGE-21 an investigator cannot grant themselves extra permissions', async () => {
    const investigator = await signedIn('investigator.demo@example.com');
    expect((await investigator.rpc('admin_set_user_roles', { p_user: '00000000-0000-4000-8000-000000000006', p_roles: ['admin'], p_reason: 'x' })).error?.code).toBe('42501');
    expect((await investigator.from('user_roles').insert({ user_id: '00000000-0000-4000-8000-000000000006', role_key: 'admin', reason: 'x' })).error).not.toBeNull();
    expect((await investigator.from('role_permissions').insert({ role_key: 'investigator', permission_key: 'settings.manage', scope: 'yes' })).error).not.toBeNull();
  });

  it('T-US84-1 and T-S24-1 the audit log is for administrators, and for officers on one claim', async () => {
    const { data, error } = await adminUser.rpc('get_audit_log', { p_category: 'access', p_page_size: 5 });
    expect(error).toBeNull();
    expect(data.rows[0]).toEqual(expect.objectContaining({ action: expect.any(String), outcome: expect.any(String) }));
    expect(data.rows[0].actor_name === null || typeof data.rows[0].actor_name === 'string').toBe(true);
    const officer = await signedIn('officer.demo@example.com');
    expect((await officer.rpc('get_audit_log', { p_claim: 'c0000000-0000-4000-8000-000000000003' })).error).toBeNull();
    expect((await officer.rpc('get_audit_log', {})).error?.code).toBe('42501');
    expect((await officer.rpc('get_audit_log', { p_claim: 'c0000000-0000-4000-8000-000000000002' })).error?.code).toBe('42501');
    expect((await (await signedIn('lawyer.demo@example.com')).rpc('get_audit_log', { p_claim: 'c0000000-0000-4000-8000-000000000003' })).error?.code).toBe('42501');
  });

  it('T-S43-1 an admin adds an organisation; others cannot', async () => {
    const name = `Integration Firm ${Date.now()}`;
    expect((await adminUser.from('organisations').insert({ name, type: 'law_firm', status: 'active' })).error).toBeNull();
    expect((await (await signedIn('officer.demo@example.com')).from('organisations').insert({ name: `${name} 2`, type: 'law_firm' })).error).not.toBeNull();
  });
});
