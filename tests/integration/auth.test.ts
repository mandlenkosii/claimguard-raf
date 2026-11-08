import { afterEach, describe, expect, it } from 'vitest';
import { adminClient, anonClient, createTestUser, deleteTestUser, ids, signedIn } from './helpers';
import { sidebarItemsFor } from '@/lib/access/navigation';

const CLAIMANT = { account_type: 'claimant', first_name: 'Test', surname: 'Claimant', popia_consent: true };
const PROTECTED_TABLES = ['claims', 'claimants', 'documents', 'profiles', 'user_roles', 'risk_alerts', 'investigation_notes', 'messages', 'notifications', 'audit_logs', 'claim_issues', 'information_requests'];

const admin = adminClient();
const cleanups: Array<() => PromiseLike<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function tempUser(metadata: Record<string, unknown>) {
  const user = await createTestUser(metadata);
  cleanups.push(() => deleteTestUser(user.id));
  return user;
}

async function tempRole(userId: string, role: string) {
  const { error } = await admin.from('user_roles').insert({ user_id: userId, role_key: role, assigned_by: ids.admin, reason: 'Integration test' });
  expect(error).toBeNull();
  cleanups.push(() => admin.from('user_roles').delete().eq('user_id', userId).eq('role_key', role));
}

describe('US1 registration', () => {
  it('T-US1-1 a claimant gets an account, profile and claimant role', async () => {
    const user = await tempUser(CLAIMANT);
    const { data: profile } = await admin.from('profiles').select('account_type, account_status').eq('id', user.id).single();
    const { data: roles } = await admin.from('user_roles').select('role_key').eq('user_id', user.id);
    expect(profile).toEqual({ account_type: 'claimant', account_status: 'active' });
    expect(roles).toEqual([{ role_key: 'claimant' }]);
  });

  it('T-US1-2 a practitioner stays pending with no lawyer role', async () => {
    const user = await tempUser({ account_type: 'legal_practitioner', first_name: 'Test', surname: 'Lawyer', popia_consent: true, firm_name: 'Nkosi & Partners Attorneys', practice_number: 'LPC-T' });
    const { data: practitioner } = await admin.from('legal_practitioners').select('verification_status').eq('profile_id', user.id).single();
    const { data: roles } = await admin.from('user_roles').select('role_key').eq('user_id', user.id);
    expect(practitioner).toEqual({ verification_status: 'pending' });
    expect(roles).toEqual([]);
  });

  it('T-US1-3 sign-up metadata cannot create a staff account or role', async () => {
    const user = await tempUser({ ...CLAIMANT, account_type: 'staff', role: 'admin', roles: ['admin', 'manager'] });
    const { data: profile } = await admin.from('profiles').select('account_type').eq('id', user.id).single();
    const { data: roles } = await admin.from('user_roles').select('role_key').eq('user_id', user.id);
    expect(profile).toEqual({ account_type: 'claimant' });
    expect(roles).toEqual([{ role_key: 'claimant' }]);
  });
});

describe('US2 sign-in', () => {
  it('T-US2-2 wrong password and unknown email give the same error', async () => {
    const wrong = await anonClient().auth.signInWithPassword({ email: 'claimant.demo@example.com', password: 'Wrong-pass-1' });
    const unknown = await anonClient().auth.signInWithPassword({ email: 'nobody.here@example.com', password: 'Wrong-pass-1' });
    expect(wrong.error?.code).toBe('invalid_credentials');
    expect(unknown.error?.code).toBe(wrong.error?.code);
  });
});

describe('US3 profile', () => {
  it('T-US3-1 a user can update their own profile fields', async () => {
    const user = await tempUser(CLAIMANT);
    const client = await signedIn(user.email, user.password);
    const { error } = await client.from('profiles').update({ first_name: 'Changed', mobile: '+27820001111' }).eq('id', user.id);
    expect(error).toBeNull();
    const { data } = await client.from('profiles').select('first_name, mobile').eq('id', user.id).single();
    expect(data).toEqual({ first_name: 'Changed', mobile: '+27820001111' });
  });
});

describe('US4 capabilities', () => {
  it('T-US4-1 OP6 returns the union of the role permissions', async () => {
    const client = await signedIn('officer.demo@example.com');
    const { data, error } = await client.rpc('my_capabilities');
    expect(error).toBeNull();
    const { data: expected } = await admin.from('role_permissions').select('permission_key').eq('role_key', 'raf_officer').neq('scope', 'no');
    expect([...data.capabilities].sort()).toEqual(expected!.map((row) => row.permission_key).sort());
    expect(data.roles).toEqual(['raf_officer']);
    expect(data.account_status).toBe('active');
  });

  it('T-US4-2 and T-EDGE-15 two roles give both capabilities and the union of rows, nothing more', async () => {
    await tempRole(ids.claimant, 'manager');
    const client = await signedIn('claimant.demo@example.com');
    const { data } = await client.rpc('my_capabilities');
    expect([...data.roles].sort()).toEqual(['claimant', 'manager']);
    expect(sidebarItemsFor(data.roles).map((item) => item.to)).toEqual(expect.arrayContaining(['/claims', '/raf/management']));

    const { data: summaries } = await client.from('claim_summaries').select('id');
    const { data: claims } = await client.from('claims').select('reference');
    expect(summaries!.length).toBe(5);
    expect(claims).toEqual([{ reference: 'CG-2026-000141' }]);
    const { data: alerts } = await client.from('risk_alerts').select('id');
    expect(alerts).toEqual([]);
  });
});

describe('US5 and session rules', () => {
  it('T-US5-1 and T-EDGE-14 a session made before suspension gets nothing on the next request', async () => {
    const user = await tempUser(CLAIMANT);
    const client = await signedIn(user.email, user.password);
    expect((await client.from('roles').select('key')).data!.length).toBe(6);

    await admin.from('profiles').update({ account_status: 'suspended' }).eq('id', user.id);
    for (const table of ['roles', ...PROTECTED_TABLES]) {
      const { data } = await client.from(table).select('*').limit(1);
      expect(data ?? [], table).toEqual([]);
    }
    const { data } = await client.rpc('my_capabilities');
    expect(data.account_status).toBe('suspended');
    expect(data.capabilities).toEqual(expect.any(Array));
  });

  it('T-AUTH-3 a role removed by an admin is denied on the next request', async () => {
    await tempRole(ids.claimant2, 'manager');
    const client = await signedIn('claimant2.demo@example.com');
    expect((await client.from('claim_summaries').select('id')).data!.length).toBe(5);
    await admin.from('user_roles').delete().eq('user_id', ids.claimant2).eq('role_key', 'manager');
    expect((await client.from('claim_summaries').select('id')).data).toEqual([]);
  });
});

describe('T-AUTH-1 and T-AUTH-2', () => {
  it('T-AUTH-1 with no session, protected tables and functions return no data', async () => {
    const client = anonClient();
    for (const table of PROTECTED_TABLES) {
      const { data, error } = await client.from(table).select('*').limit(1);
      expect(data ?? [], table).toEqual([]);
      expect(error?.code, table).toBe('42501');
    }
    const { error } = await client.rpc('my_capabilities');
    expect(error).not.toBeNull();
  });

  it('T-AUTH-2 a user cannot add a role to themselves through the API', async () => {
    const client = await signedIn('claimant.demo@example.com');
    const { error } = await client.from('user_roles').insert({ user_id: ids.claimant, role_key: 'admin', reason: 'self' });
    expect(error?.code).toBe('42501');
    const { data } = await admin.from('user_roles').select('role_key').eq('user_id', ids.claimant);
    expect(data).toEqual([{ role_key: 'claimant' }]);
  });
});
