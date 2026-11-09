import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import * as api from '@/features/admin/api';
import { TXT } from '@/lib/format/messages';
import { AuditTab } from '@/pages/claims/workspace/AuditTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/admin/api');
const row: api.AuditRow = { id: 1, created_at: '2026-02-25T10:00:00Z', actor_name: 'Demo RAF Officer', actor_role: 'raf_officer', action: 'STATUS_CHANGED', resource_type: 'claim', resource_id: 'c1', outcome: 'success', change_summary: { status: { from: 'draft', to: 'validation' } }, reason: 'Ready', session_ref: null };
const officer = makeSession({ roles: ['raf_officer'], capabilities: ['audit.view'] });
const show = (session: AuthSession = officer) => renderScreen(<Routes><Route path="/claims/:id/audit" element={<AuditTab />} /></Routes>, session, '/claims/c1/audit');

describe('S24 Audit', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S24-1 shows the table, the notice and an expandable change', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [row], total: 1, counts: { total: 1, denied: 0 } });
    show();
    expect(await screen.findByText('STATUS_CHANGED')).toBeInTheDocument();
    expect(api.getAuditLog).toHaveBeenCalledWith(expect.objectContaining({ claimId: 'c1' }), 1, 25);
    expect(screen.getByText('Audit records are append-only and never include document contents or credentials.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Expand row/ }));
    expect(await screen.findByText('status: draft → validation')).toBeInTheDocument();
  });

  it('T-S24-1 Export (CSV) shows for officers with audit.view and administrators', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [row], total: 1, counts: { total: 1, denied: 0 } });
    show();
    expect(await screen.findByRole('button', { name: 'Export (CSV)' })).toBeInTheDocument();
  });

  it('T-S24-1 Export (CSV) is hidden from anyone else', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [row], total: 1, counts: { total: 1, denied: 0 } });
    show(makeSession({ roles: ['raf_officer'], capabilities: [] }));
    await screen.findByText('STATUS_CHANGED');
    expect(screen.queryByRole('button', { name: 'Export (CSV)' })).toBeNull();
  });

  it('T-S24 empty shows TXT-55', async () => {
    vi.mocked(api.getAuditLog).mockResolvedValue({ rows: [], total: 0, counts: { total: 0, denied: 0 } });
    show();
    expect(await screen.findByText(TXT[55])).toBeInTheDocument();
  });
});
