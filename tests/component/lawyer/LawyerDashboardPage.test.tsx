import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/dashboards/api';
import { TXT } from '@/lib/format/messages';
import { LawyerDashboardPage } from '@/pages/lawyer/LawyerDashboardPage';
import { makeSession, renderScreen } from '../../fixtures/auth';
import { metrics, workItem } from '../dashboards/fixtures';

vi.mock('@/features/dashboards/api');
const lawyer = makeSession({ roles: ['lawyer'] });

describe('S26 Lawyer dashboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US75-1 and T-US80-1 shows server counts with the demo label', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue(metrics);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<LawyerDashboardPage />, lawyer);
    expect((await screen.findByText('Active claims')).parentElement).toHaveTextContent('21');
    expect(screen.getByText('Open requests').parentElement).toHaveTextContent('6');
    expect(screen.getByText('Blocking issues').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Ready claims').parentElement).toHaveTextContent('3');
    expect(screen.getAllByText('Demonstration data').length).toBeGreaterThanOrEqual(4);
    expect(api.getMetrics).toHaveBeenCalledWith('lawyer');
  });

  it('T-US76-1 Needs your attention lists requests and issues', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue(metrics);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([workItem({ id: 'i', title: 'Hospital report missing', kind: 'issue' }), workItem({ id: 'r', title: 'Provide letter', kind: 'request' })]);
    renderScreen(<LawyerDashboardPage />, lawyer);
    const list = await screen.findByTestId('attention');
    expect(within(list).getByRole('link', { name: 'Hospital report missing' })).toHaveAttribute('href', '/claims/c1/readiness');
    expect(within(list).getByRole('link', { name: 'Provide letter' })).toHaveAttribute('href', '/claims/c1/requests/r');
  });

  it('T-S26 nothing outstanding shows TXT-58', async () => {
    vi.mocked(api.getMetrics).mockResolvedValue(metrics);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<LawyerDashboardPage />, lawyer);
    expect(await screen.findByText(TXT[58])).toBeInTheDocument();
  });

  it('T-S26 the error state retries', async () => {
    vi.mocked(api.getMetrics).mockRejectedValue(new Error('failed'));
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<LawyerDashboardPage />, lawyer);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
