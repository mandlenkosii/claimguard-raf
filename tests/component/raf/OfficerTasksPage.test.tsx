import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/dashboards/api';
import { TXT } from '@/lib/format/messages';
import { groupByDue, OfficerTasksPage } from '@/pages/raf/OfficerTasksPage';
import { makeSession, renderScreen } from '../../fixtures/auth';
import { workItem } from '../dashboards/fixtures';

vi.mock('@/features/dashboards/api');
const officer = makeSession({ roles: ['raf_officer'] });
const today = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const items = [
  workItem({ id: 'o', title: 'Overdue item', kind: 'request', status: 'pending', due_date: '2020-01-01' }),
  workItem({ id: 't', title: 'Today item', kind: 'request', status: 'pending', due_date: today }),
  workItem({ id: 'w', title: 'Week item', kind: 'request', status: 'pending', due_date: inDays(3) }),
  workItem({ id: 'l', title: 'Later item', kind: 'issue', due_date: null }),
  workItem({ id: 'f', title: 'Far item', kind: 'request', status: 'pending', due_date: inDays(30) }),
];

describe('S33 Officer tasks', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S33-1 groups into Due today, This week, Later and Overdue', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue(items);
    renderScreen(<OfficerTasksPage />, officer);
    expect(within(await screen.findByTestId('group-Overdue')).getByRole('button', { name: /Overdue item/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-Due today')).getByRole('button', { name: /Today item/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-This week')).getByRole('button', { name: /Week item/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-Later')).getByRole('button', { name: /Later item/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-Later')).getByRole('button', { name: /Far item/ })).toBeInTheDocument();
  });

  it('T-S33-1 the selected task panel links to the claim', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue(items);
    renderScreen(<OfficerTasksPage />, officer);
    fireEvent.click(await screen.findByRole('button', { name: /Week item/ }));
    const panel = screen.getByTestId('selected-task');
    expect(within(panel).getByRole('heading', { name: 'Week item' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Open claim' })).toHaveAttribute('href', '/claims/c1/requests/w');
  });

  it('T-S33 empty shows TXT-58', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<OfficerTasksPage />, officer);
    expect(await screen.findByText(TXT[58])).toBeInTheDocument();
  });

  it('T-S33 groupByDue leaves closed work out of Overdue', () => {
    expect(groupByDue([workItem({ status: 'closed', due_date: '2020-01-01', kind: 'request' })]).Overdue).toEqual([]);
  });
});
