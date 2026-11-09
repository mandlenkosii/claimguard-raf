import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Composer, MessageThread } from '@/components/domain/Messages';
import { TXT } from '@/lib/format/messages';

const message = { id: 'm1', body: 'Hello there', author_id: 'u1', author_name: 'Lindiwe Nkosi', author_role: 'lawyer', created_at: '2026-02-25T10:00:00Z' };

describe('T-C-28 MessageThread and Composer', () => {
  it('T-US60-1 shows author, role chip and timestamp', () => {
    render(<MessageThread messages={[message]} currentUserId="u2" />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Lindiwe Nkosi')).toBeInTheDocument();
    expect(screen.getByText('Lawyer')).toBeInTheDocument();
    expect(screen.getByText(/25 Feb 2026/)).toBeInTheDocument();
  });

  it('T-C-28 marks my own message', () => {
    render(<MessageThread messages={[message]} currentUserId="u1" />);
    expect(screen.getByTestId('message-m1')).toHaveAttribute('data-own', 'true');
  });

  it('T-C-28 an empty message is refused', async () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(TXT[4])).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('T-C-28 sends and clears', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<Composer onSend={onSend} />);
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('Hi'));
    await waitFor(() => expect(screen.getByLabelText(/Message/)).toHaveValue(''));
  });

  it('T-C-28 a failed send keeps the text and shows TXT-38', async () => {
    const onSend = vi.fn().mockRejectedValue(new Error('failed'));
    render(<Composer onSend={onSend} />);
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(TXT[38])).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toHaveValue('Hi');
  });

  it('T-C-28 disabled while offline', () => {
    render(<Composer onSend={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
