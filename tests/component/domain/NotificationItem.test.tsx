import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NotificationItem } from '@/components/domain/NotificationItem';

const item = { id: 'n1', type: 'request', title: 'New information request', summary: 'You have a new information request on claim CG-2026-000142.', link: '/claims/c/requests/r', read_at: null, created_at: '2026-02-25T10:00:00Z' };

describe('T-C-29 NotificationItem', () => {
  it('T-C-29 unread shows a dot and bold text, and opening reports it', () => {
    const onOpen = vi.fn();
    const { container } = render(<MemoryRouter><NotificationItem notification={item} onOpen={onOpen} /></MemoryRouter>);
    expect(screen.getByTestId('unread-dot')).toBeInTheDocument();
    expect(screen.getByText('New information request').className).toContain('font-semibold');
    expect(container.querySelector('svg')).not.toBeNull();
    const link = screen.getByRole('link', { name: /New information request/ });
    expect(link).toHaveAttribute('href', '/claims/c/requests/r');
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith('n1');
  });

  it('T-C-29 read has no dot and is not bold', () => {
    render(<MemoryRouter><NotificationItem notification={{ ...item, read_at: '2026-02-25T11:00:00Z' }} onOpen={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByTestId('unread-dot')).toBeNull();
    expect(screen.getByText('New information request').className).not.toContain('font-semibold');
  });
});
