import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/messages/api';
import { NO_CLAIM_PERMISSION, TXT } from '@/lib/format/messages';
import { MessagesTab } from '@/pages/claims/workspace/MessagesTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/messages/api');

const NOTICE = 'Messages are not official RAF submissions or legal notices.';
const data: api.Messaging = {
  is_participant: true,
  threads: [
    { id: 't1', title: 'Medical report query', created_at: '2026-02-20T10:00:00Z', last_message_at: '2026-02-25T10:00:00Z', last_message_body: 'Please confirm.' },
    { id: 't2', title: 'General', created_at: '2026-02-21T10:00:00Z', last_message_at: null, last_message_body: null },
  ],
  participants: [{ id: 'u1', name: 'Lindiwe Nkosi', role: 'lawyer' }, { id: 'u2', name: 'Demo RAF Officer', role: 'raf_officer' }],
};
const message = { id: 'm1', body: 'Please confirm the spelling.', author_id: 'u2', author_name: 'Demo RAF Officer', author_role: 'raf_officer', created_at: '2026-02-25T10:00:00Z' };
const show = () =>
  renderScreen(<Routes><Route path="/claims/:id/messages" element={<MessagesTab />} /></Routes>, makeSession({ userId: 'u1', roles: ['lawyer'] }), '/claims/c1/messages');

describe('S20 Messages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getThreadMessages).mockResolvedValue([message]);
  });

  it('T-US59-1 and T-US60-1 lists threads and shows the first conversation', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue(data);
    show();
    expect(await screen.findByRole('button', { name: /Medical report query/ })).toBeInTheDocument();
    expect(await screen.findByText('Please confirm the spelling.')).toBeInTheDocument();
    expect(api.getThreadMessages).toHaveBeenCalledWith('t1');
    expect(screen.getByText('RAF officer')).toBeInTheDocument();
  });

  it('T-US59-2 and T-BR33-1 the notice sits above the composer, exactly', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue(data);
    show();
    const notice = await screen.findByText(NOTICE);
    expect(notice.compareDocumentPosition(screen.getByRole('button', { name: 'Send' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T-US59-1 sends into the open thread', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue(data);
    vi.mocked(api.sendMessage).mockResolvedValue(undefined);
    show();
    await screen.findByText('Please confirm the spelling.');
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'Confirmed.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith({ claimId: 'c1', threadId: 't1', body: 'Confirmed.' }));
    await waitFor(() => expect(vi.mocked(api.getThreadMessages).mock.calls.length).toBeGreaterThan(1));
  });

  it('T-S20 choosing another thread loads it', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue(data);
    show();
    fireEvent.click(await screen.findByRole('button', { name: /General/ }));
    await waitFor(() => expect(api.getThreadMessages).toHaveBeenCalledWith('t2'));
  });

  it('T-S20 participants collapse and expand', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue(data);
    show();
    const toggle = await screen.findByRole('button', { name: 'Participants (2)' });
    expect(screen.queryByText('Lindiwe Nkosi')).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText('Lindiwe Nkosi')).toBeInTheDocument();
  });

  it('T-S20 empty shows TXT-54 and starts a thread', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue({ ...data, threads: [] });
    vi.mocked(api.createThread).mockResolvedValue('t9');
    show();
    expect(await screen.findByText(TXT[54])).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'New thread' })[0]!);
    fireEvent.change(screen.getByLabelText(/Thread title/), { target: { value: 'Question' } });
    fireEvent.change(screen.getByLabelText(/First message/), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start thread' }));
    await waitFor(() => expect(api.createThread).toHaveBeenCalledWith({ claimId: 'c1', title: 'Question', body: 'Hello' }));
  });

  it('T-SEC-21 someone who is not a participant sees the restricted view', async () => {
    vi.mocked(api.getMessaging).mockResolvedValue({ is_participant: false, threads: [], participants: [] });
    show();
    expect(await screen.findByText(NO_CLAIM_PERMISSION)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });

  it('T-S20 the error state retries', async () => {
    vi.mocked(api.getMessaging).mockRejectedValue(new Error('failed'));
    show();
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
