import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/notifications/api';
import { TXT } from '@/lib/format/messages';
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/notifications/api');

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const row = (id: string, days: number, read_at: string | null = null): api.Notification => ({ id, type: 'request', title: `Title ${id}`, summary: 'A summary', link: '/claims/c', read_at, created_at: ago(days) });

describe('S12 Notifications', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US71-1 groups into Today, Yesterday and Earlier', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue({ rows: [row('a', 0), row('b', 1), row('c', 9)], total: 3 });
    renderScreen(<NotificationsPage />, makeSession());
    expect(within(await screen.findByTestId('group-Today')).getByText('Title a')).toBeInTheDocument();
    expect(within(screen.getByTestId('group-Yesterday')).getByText('Title b')).toBeInTheDocument();
    expect(within(screen.getByTestId('group-Earlier')).getByText('Title c')).toBeInTheDocument();
  });

  it('T-US71-1 has the five tabs and each reloads', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue({ rows: [], total: 0 });
    renderScreen(<NotificationsPage />, makeSession());
    await waitFor(() => expect(api.getNotifications).toHaveBeenCalledWith('all', 1, 20));
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['All', 'Unread', 'Requests', 'Messages', 'Claim updates']);
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    await waitFor(() => expect(api.getNotifications).toHaveBeenCalledWith('messages', 1, 20));
  });

  it('T-US71-1 Mark all as read clears them', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue({ rows: [row('a', 0)], total: 1 });
    vi.mocked(api.markAllRead).mockResolvedValue(undefined);
    renderScreen(<NotificationsPage />, makeSession());
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(api.markAllRead).toHaveBeenCalled());
    await waitFor(() => expect(vi.mocked(api.getNotifications).mock.calls.length).toBeGreaterThan(1));
  });

  it('T-US71-1 opening one marks it read', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue({ rows: [row('a', 0)], total: 1 });
    vi.mocked(api.markRead).mockResolvedValue(undefined);
    renderScreen(<NotificationsPage />, makeSession());
    fireEvent.click(await screen.findByRole('link', { name: /Title a/ }));
    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith('a'));
  });

  it('T-S12 empty shows TXT-50', async () => {
    vi.mocked(api.getNotifications).mockResolvedValue({ rows: [], total: 0 });
    renderScreen(<NotificationsPage />, makeSession());
    expect(await screen.findByText(TXT[50])).toBeInTheDocument();
  });

  it('T-S12 the error state retries', async () => {
    vi.mocked(api.getNotifications).mockRejectedValue(new Error('failed'));
    renderScreen(<NotificationsPage />, makeSession());
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
