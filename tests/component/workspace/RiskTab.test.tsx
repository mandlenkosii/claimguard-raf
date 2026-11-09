import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import * as api from '@/features/risk/api';
import { RiskTab } from '@/pages/claims/workspace/RiskTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/risk/api');

const alert: api.AlertSummary = {
  id: 'a1', reference: 'RA-2026-00031', rule_id: 'RULE-003', rule_version: '1.0.0', title: 'Conflicting accident dates', explanation: 'The dates differ.',
  severity: 'HIGH', status: 'UNDER_REVIEW', indicator_type: 'date_inconsistency', created_at: '2026-02-24T10:00:00Z', assignee_name: 'Ayesha Patel', evidence_count: 2,
};
const investigator = makeSession({ roles: ['investigator'] });
const officer = makeSession({ roles: ['raf_officer'] });
const show = (session: AuthSession) =>
  renderScreen(<Routes><Route path="/claims/:id/risk" element={<RiskTab />} /></Routes>, session, '/claims/c1/risk');

describe('S19 Risk', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US45-1 and T-US52-1 shows both notices and the alerts to the investigator', async () => {
    vi.mocked(api.getClaimAlerts).mockResolvedValue([alert]);
    show(investigator);
    expect(await screen.findByRole('heading', { name: 'Conflicting accident dates' })).toBeInTheDocument();
    expect(screen.getByText('Risk alerts are indicators for human review. They are not findings of fraud.')).toBeInTheDocument();
    expect(screen.getByText('Visible to authorised investigators only.')).toBeInTheDocument();
  });

  it('T-S19 shows the empty state', async () => {
    vi.mocked(api.getClaimAlerts).mockResolvedValue([]);
    show(investigator);
    expect(await screen.findByText('No risk alerts for this claim.')).toBeInTheDocument();
  });

  it('T-US52-1 the officer sees only the neutral flag', async () => {
    vi.mocked(api.getRiskFlag).mockResolvedValue({ flag: 'Under review', outcome_label: null });
    show(officer);
    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Conflicting accident dates' })).toBeNull();
    expect(api.getClaimAlerts).not.toHaveBeenCalled();
  });

  it('T-S19 the officer sees the final outcome label', async () => {
    vi.mocked(api.getRiskFlag).mockResolvedValue({ flag: null, outcome_label: 'extraction_error_corrected' });
    show(officer);
    expect(await screen.findByText('Extraction error corrected')).toBeInTheDocument();
  });

  it('T-S19 the error state retries', async () => {
    vi.mocked(api.getClaimAlerts).mockRejectedValue(new Error('failed'));
    show(investigator);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
