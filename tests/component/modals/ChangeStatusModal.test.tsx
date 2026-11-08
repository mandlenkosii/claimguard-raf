import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/workflow/api';
import { TXT } from '@/lib/format/messages';
import { ChangeStatusModal } from '@/modals/ChangeStatusModal';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/workflow/api');

const OPTIONS = {
  allowed: [{ status: 'ready', label: 'Ready' }],
  blocked: [{ status: 'submitted', label: 'Submitted', reason: 'Submitted — claim must be Ready first' }],
};
const onClose = vi.fn();
const onChanged = vi.fn();
const show = () => renderScreen(<ChangeStatusModal open claimId="c1" reference="CG-2026-000142" currentStatus="validation" onClose={onClose} onChanged={onChanged} />, makeSession());
const reason = (value: string) => fireEvent.change(screen.getByLabelText(/Reason for change/), { target: { value } });
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));

describe('M2 Change status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.allowedTransitions).mockResolvedValue(OPTIONS);
  });

  it('T-US68-1 allowed transitions are selectable and blocked ones are disabled with their reason', async () => {
    show();
    expect(await screen.findByRole('radio', { name: /^Ready/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /Submitted/ })).toBeDisabled();
    expect(screen.getByText('Submitted — claim must be Ready first')).toBeInTheDocument();
  });

  it('T-M2-1 with no reason Confirm change does not submit, and the footnote shows', async () => {
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /^Ready/ }));
    confirm();
    expect(screen.getByText(TXT[18])).toBeInTheDocument();
    expect(api.transitionStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Status changes are recorded in the timeline and audit history.')).toBeInTheDocument();
  });

  it('T-US66-1 a confirmed change sends the reason and shows TXT-19', async () => {
    vi.mocked(api.transitionStatus).mockResolvedValue({ ok: true, status: 'ready' });
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /^Ready/ }));
    reason('All issues resolved');
    confirm();
    await waitFor(() => expect(api.transitionStatus).toHaveBeenCalledWith(expect.objectContaining({ claimId: 'c1', target: 'ready', reason: 'All issues resolved' })));
    expect(await screen.findByText('Claim status updated to Ready.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('T-M2 a refusal after opening shows TXT-20 with the reason', async () => {
    vi.mocked(api.transitionStatus).mockResolvedValue({ ok: false, code: 'blocked', reason: 'Ready — 1 blocking issue open' });
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /^Ready/ }));
    reason('Trying');
    confirm();
    expect(await screen.findByText("This status change isn't allowed right now. Ready — 1 blocking issue open")).toBeInTheDocument();
  });

  it('T-M2 missing claim fields show TXT-17', async () => {
    vi.mocked(api.transitionStatus).mockResolvedValue({ ok: false, code: 'missing_fields', missing: ['Accident date', 'Claimant role'] });
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /^Ready/ }));
    reason('Trying');
    confirm();
    expect(await screen.findByText('Complete these fields before continuing: Accident date, Claimant role.')).toBeInTheDocument();
  });
});
