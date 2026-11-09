import { describe, expect, it } from 'vitest';
import { createTestUser, deleteTestUser, signedIn } from './helpers';
import { createClaim } from './helpers-claims';
import { startUpload } from './documentHelpers';

describe('T-NFR-17 upload limit', () => {
  it('refuses the 11th confirmed upload by one user within a minute', async () => {
    const user = await createTestUser({ account_type: 'claimant', first_name: 'Rate', surname: 'Limit', popia_consent: true });
    const client = await signedIn(user.email, user.password);
    const { id } = await createClaim(client, null);
    const confirm = async (index: number) => {
      const upload = await startUpload(client, id, user.id, `rate_${index}_SAMPLE.pdf`);
      expect(upload.error).toBeNull();
      const { data, error } = await client.rpc('confirm_document_upload', { p_version: upload.versionId });
      expect(error).toBeNull();
      return data as { ok: boolean; code?: string };
    };
    for (let index = 1; index <= 10; index += 1) expect((await confirm(index)).ok).toBe(true);
    expect(await confirm(11)).toEqual({ ok: false, code: 'rate_limited' });
    await deleteTestUser(user.id).catch(() => undefined);
  }, 60000);
});

