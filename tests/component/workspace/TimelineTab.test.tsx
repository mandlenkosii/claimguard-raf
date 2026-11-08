import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import * as api from '@/features/claims/api';
import { TXT } from '@/lib/format/messages';
import { TimelineTab } from '@/pages/claims/workspace/TimelineTab';
import { CLAIM_ID, timelineEvents } from '../../fixtures/claims';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');

const show = () =>
  renderScreen(
    <Routes>
      <Route path="/claims/:id/timeline" element={<TimelineTab />} />
    </Routes>,
    makeSession(),
    `/claims/${CLAIM_ID}/timeline`,
  );

describe('S23 Timeline', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US67-1 events are grouped by date with actor, role chip and time', async () => {
    vi.mocked(api.getTimeline).mockResolvedValue(timelineEvents);
    show();
    expect(await screen.findByText('Claim created', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByTestId('timeline-group')).toHaveLength(2);
    expect(screen.getAllByText('Lindiwe Nkosi').length).toBeGreaterThan(0);
  });

  it('T-US68-3 a blocked attempt shows in grey with its reason', async () => {
    vi.mocked(api.getTimeline).mockResolvedValue(timelineEvents);
    show();
    expect((await screen.findByText('Status change to Ready blocked')).closest('[data-event]')).toHaveAttribute('data-blocked', 'true');
    expect(screen.getByText('Ready — 1 blocking issue open')).toBeInTheDocument();
  });

  it('T-US67-1 event type, actor and date filters work', async () => {
    vi.mocked(api.getTimeline).mockResolvedValue(timelineEvents);
    show();
    await screen.findByText('Claim created', { selector: 'p' });
    fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'document_uploaded' } });
    expect(screen.getByText('Document uploaded', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('Claim created', { selector: 'p' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'Demo RAF Officer' } });
    expect(screen.queryByText('Document uploaded', { selector: 'p' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-02-01' } });
    expect(screen.queryByText('Claim created', { selector: 'p' })).toBeNull();
    expect(screen.getByText('Document uploaded', { selector: 'p' })).toBeInTheDocument();
  });

  it('T-S23 no matching events shows TXT-55', async () => {
    vi.mocked(api.getTimeline).mockResolvedValue([]);
    show();
    expect(await screen.findByText(TXT[55])).toBeInTheDocument();
  });
});
