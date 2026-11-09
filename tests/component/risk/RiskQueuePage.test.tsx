import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/risk/api';
import { RiskQueuePage } from '@/pages/risk/RiskQueuePage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/risk/api');

const row = (overrides: Partial<api.QueueRow> = {}): api.QueueRow => ({
  id: 'a1', reference: 'RA-2026-00031', claim_id: 'c1', claim_reference: 'CG-2026-000144', claimant_name: 'Lerato Molefe', indicator_type: 'date_inconsistency',
  severity: 'HIGH', status: 'UNDER_REVIEW', assigned_to: 'u1', assignee_name: 'Ayesha Patel', created_at: '2026-02-24T10:00:00Z', age_days: 7, can_open: true, ...overrides,
});
const counts = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 0 };
const investigator = makeSession({ userId: 'u1', roles: ['investigator'] });
const defaults = { severity: '', status: '', indicator: '', assignee: '', age: '' };

describe('S35 Risk queue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getInvestigators).mockResolvedValue([{ id: 'u1', name: 'Ayesha Patel' }]);
  });

  it('T-US47-1 and T-US45-1 shows the notice, severity counts, tabs, filters and rows', async () => {
    vi.mocked(api.getRiskQueue).mockResolvedValue({ rows: [row()], total: 1, counts });
    renderScreen(<RiskQueuePage />, investigator);
    expect(await screen.findByRole('link', { name: 'RA-2026-00031' })).toHaveAttribute('href', '/raf/risk/a1');
    expect(screen.getByText('Alerts are indicators for review, not findings of fraud.')).toBeInTheDocument();
    const summary = screen.getByTestId('severity-counts');
    for (const [label, value] of [['Critical', '0'], ['High', '3'], ['Medium', '2'], ['Low', '1']] as const) {
      expect(within(summary).getByText(label).parentElement).toHaveTextContent(value);
    }
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Assigned to me', 'Unassigned', 'Escalated', 'All permitted']);
    for (const filter of ['Severity', 'Status', 'Indicator type', 'Assignee', 'Age']) expect(screen.getByLabelText(filter)).toBeInTheDocument();
    expect(screen.getByText('Lerato Molefe')).toBeInTheDocument();
  });

  it('T-US47-1 changing tab and filter reloads the queue', async () => {
    vi.mocked(api.getRiskQueue).mockResolvedValue({ rows: [], total: 0, counts });
    renderScreen(<RiskQueuePage />, investigator);
    await waitFor(() => expect(api.getRiskQueue).toHaveBeenCalledWith('assigned', defaults, 1, 20));
    fireEvent.click(screen.getByRole('tab', { name: 'Escalated' }));
    await waitFor(() => expect(api.getRiskQueue).toHaveBeenCalledWith('escalated', defaults, 1, 20));
    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'HIGH' } });
    await waitFor(() => expect(api.getRiskQueue).toHaveBeenCalledWith('escalated', { ...defaults, severity: 'HIGH' }, 1, 20));
  });

  it('T-S35 shows TXT-52 when nothing matches', async () => {
    vi.mocked(api.getRiskQueue).mockResolvedValue({ rows: [], total: 0, counts });
    renderScreen(<RiskQueuePage />, investigator);
    expect(await screen.findByText('No alerts match these filters.')).toBeInTheDocument();
  });

  it('T-US43-1 an unassigned alert can be assigned to me, not opened', async () => {
    vi.mocked(api.getRiskQueue).mockResolvedValue({ rows: [row({ assigned_to: null, assignee_name: null, can_open: false })], total: 1, counts });
    vi.mocked(api.updateAlert).mockResolvedValue(undefined);
    renderScreen(<RiskQueuePage />, investigator);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign RA-2026-00031 to me' }));
    await waitFor(() => expect(api.updateAlert).toHaveBeenCalledWith({ alertId: 'a1', assignedTo: 'u1' }));
    expect(screen.queryByRole('link', { name: 'RA-2026-00031' })).toBeNull();
  });

  it('T-S35 the error state retries', async () => {
    vi.mocked(api.getRiskQueue).mockRejectedValue(new Error('failed'));
    renderScreen(<RiskQueuePage />, investigator);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
