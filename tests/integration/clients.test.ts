import { describe, expect, it } from 'vitest';
import { signedIn } from './helpers';

describe('Clients', () => {
  it('T-S27-1 a lawyer sees only their firm\'s clients', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { data } = await lawyer.from('client_relationships').select('organisation_id');
    expect(new Set(data!.map((row) => row.organisation_id))).toEqual(new Set(['a0000000-0000-4000-8000-000000000001']));
  });

  it('T-S27-2 Add client creates a relationship for the lawyer\'s firm', async () => {
    const lawyer = await signedIn('lawyer.demo@example.com');
    const { data: id, error } = await lawyer.rpc('add_client', { p_first_name: 'Fictional', p_surname: `Client${Date.now()}`, p_id_number: 'SYN9', p_date_of_birth: null, p_email: null, p_mobile: null, p_assigned_lawyer: null, p_mandate_status: 'pending' });
    expect(error).toBeNull();
    const { data } = await lawyer.from('client_relationships').select('organisation_id, mandate_status').eq('claimant_id', id).single();
    expect(data).toEqual({ organisation_id: 'a0000000-0000-4000-8000-000000000001', mandate_status: 'pending' });
  });

  it('T-S27-2 a claimant cannot add a client', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { error } = await claimant.rpc('add_client', { p_first_name: 'A', p_surname: 'B', p_id_number: null, p_date_of_birth: null, p_email: null, p_mobile: null, p_assigned_lawyer: null, p_mandate_status: 'pending' });
    expect(error?.code).toBe('42501');
  });
});
