import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/dashboards/api';
import { TXT } from '@/lib/format/messages';
import { LawyerTasksPage } from '@/pages/lawyer/LawyerTasksPage';
import { makeSession, renderScreen } from '../../fixtures/auth';
import { workItem } from '../dashboards/fixtures';

vi.mock('@/features/dashboards/api');
const lawyer = makeSession({ roles: ['lawyer'] });
const items = [
  workItem({ id: 'a', title: 'To do item', column: 'todo' }),
  workItem({ id: 'b', title: 'Progress item', column: 'in_progress', status: 'under_review' }),
  workItem({ id: 'c', title: 'Waiting item', kind: 'request', column: 'waiting', status: 'pending', due_date: '2020-01-01' }),
];

describe('S29 Lawyer tasks', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S29-1 the list shows the design columns from requests and issues, with no New task', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue(items);
    renderScreen(<LawyerTasksPage />, lawyer);
    expect(await screen.findByRole('link', { name: 'To do item' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(expect.arrayContaining(['Task', 'Source', 'Claim', 'Claimant', 'Due', 'Status']));
    expect(screen.getAllByText('Readiness issue').length).toBeGreaterThan(0);
    expect(screen.getByText('Information request')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New task/ })).toBeNull();
    expect(api.getOutstandingWork).toHaveBeenCalledWith('lawyer');
  });

  it('T-S29-1 the board has To do, In progress and Waiting on client', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue(items);
    renderScreen(<LawyerTasksPage />, lawyer);
    await screen.findByRole('link', { name: 'To do item' });
    fireEvent.click(screen.getByRole('radio', { name: 'Board' }));
    expect(within(screen.getByTestId('column-todo')).getByText('To do item')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-in_progress')).getByText('Progress item')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-waiting')).getByText('Waiting item')).toBeInTheDocument();
  });

  it('T-S29-1 empty shows TXT-58', async () => {
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<LawyerTasksPage />, lawyer);
    expect(await screen.findByText(TXT[58])).toBeInTheDocument();
  });

  it('T-S29 the error state retries', async () => {
    vi.mocked(api.getOutstandingWork).mockRejectedValue(new Error('failed'));
    renderScreen(<LawyerTasksPage />, lawyer);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
