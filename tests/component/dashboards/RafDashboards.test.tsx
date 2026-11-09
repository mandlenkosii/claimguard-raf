import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/dashboards/api';
import { ManagementDashboardPage } from '@/pages/raf/ManagementDashboardPage';
import { RafDashboardPage } from '@/pages/raf/RafDashboardPage';
import { makeSession, renderScreen } from '../../fixtures/auth';
import { metrics, workItem } from './fixtures';

vi.mock('@/features/dashboards/api');

describe('S30 and S38 dashboards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US76-1 and T-US80-1 the officer sees counts and Overdue requests only', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue(metrics);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([workItem({ id: 'late', kind: 'request', title: 'Late one', status: 'pending', due_date: '2020-01-01' }), workItem({ id: 'fine', kind: 'request', title: 'Fine one', status: 'pending', due_date: '2099-01-01' })]);
    renderScreen(<RafDashboardPage />, makeSession({ roles: ['raf_officer'] }));
    expect((await screen.findByText('Assigned claims')).parentElement).toHaveTextContent('21');
    expect(screen.getByText('Awaiting review').parentElement).toHaveTextContent('5');
    const list = await screen.findByTestId('overdue');
    expect(within(list).getByRole('link', { name: 'Late one' })).toBeInTheDocument();
    expect(within(list).queryByText('Fine one')).toBeNull();
    expect(api.getMetrics).toHaveBeenCalledWith('raf_officer');
    expect(screen.getAllByText('Demonstration data').length).toBeGreaterThan(0);
  });

  it('T-US79-1 and T-US80-1 the manager sees totals only', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue(metrics);
    renderScreen(<ManagementDashboardPage />, makeSession({ roles: ['manager'] }));
    expect((await screen.findByText('Total claims')).parentElement).toHaveTextContent('21');
    expect(screen.getByText('Average readiness').parentElement).toHaveTextContent('84%');
    expect(screen.getByText('Open risk alerts').parentElement).toHaveTextContent('3');
    expect(api.getOutstandingWork).not.toHaveBeenCalled();
    expect(screen.getByRole('table', { name: 'Claims by status' })).toBeInTheDocument();
    expect(screen.getAllByText('Demonstration data').length).toBeGreaterThan(0);
  });

  it('T-S38 no assessments shows a dash, not zero', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue({ ...metrics, average_readiness: null });
    renderScreen(<ManagementDashboardPage />, makeSession({ roles: ['manager'] }));
    expect((await screen.findByText('Average readiness')).parentElement).toHaveTextContent('—');
  });
});
