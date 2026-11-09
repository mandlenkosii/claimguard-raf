import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/admin/api';
import { TXT } from '@/lib/format/messages';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/admin/api');
const admin = makeSession({ roles: ['admin'] });
const row = (overrides: Partial<api.AuditRow> = {}): api.AuditRow => ({
  id: 1, created_at: '2026-02-25T10:00:00Z', actor_name: 'Demo Admin', actor_role: 'admin', action: 'ROLE_CHANGED', resource_type: 'user_role', resource_id: 'u1', outcome: 'success', change_summary: { role_key: 'lawyer' }, reason: 'Verified', session_ref: 'sess-1', ...overrides,
});
const noFilters = { actorRole: '', category: '', outcome: '', from: '', to: '' };

describe('S42 Audit log', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US84-1 shows actor, event, resource, outcome, summary and session', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [row()], total: 1, counts: { total: 1, denied: 0 } });
    renderScreen(<AuditLogPage />, admin);
    const cells = within((await screen.findByText('ROLE_CHANGED')).closest('tr')!);
    expect(cells.getByText('Demo Admin')).toBeInTheDocument();
    expect(cells.getByText('user_role')).toBeInTheDocument();
    expect(cells.getByText('Success')).toBeInTheDocument();
    expect(cells.getByText(/role_key: lawyer/)).toBeInTheDocument();
    expect(cells.getByText('sess-1')).toBeInTheDocument();
  });

  it('T-US84-1 a denied attempt shows Denied in red text', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [row({ outcome: 'denied' })], total: 1, counts: { total: 1, denied: 1 } });
    renderScreen(<AuditLogPage />, admin);
    expect((await screen.findByText('Denied', { selector: 'span' })).className).toContain('text-error');
  });

  it('T-US84-1 filters reload', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [], total: 0, counts: { total: 0, denied: 0 } });
    renderScreen(<AuditLogPage />, admin);
    await waitFor(() => expect(api.getAuditLog).toHaveBeenCalledWith({ ...noFilters }, 1, 25));
    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'denied' } });
    await waitFor(() => expect(api.getAuditLog).toHaveBeenCalledWith({ ...noFilters, outcome: 'denied' }, 1, 25));
  });

  it('T-S42 empty shows TXT-55', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [], total: 0, counts: { total: 0, denied: 0 } });
    renderScreen(<AuditLogPage />, admin);
    expect(await screen.findByText(TXT[55])).toBeInTheDocument();
  });

  it('T-S42 the error state retries', async () => {
    vi.mocked(api.getAuditLog).mockRejectedValue(new Error('failed'));
    renderScreen(<AuditLogPage />, admin);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
