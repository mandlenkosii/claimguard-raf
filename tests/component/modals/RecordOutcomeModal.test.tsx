import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/risk/api';
import { TXT } from '@/lib/format/messages';
import { RecordOutcomeModal } from '@/modals/RecordOutcomeModal';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/risk/api');

const investigator = makeSession({ displayName: 'Ayesha Patel', roles: ['investigator'] });
const onRecorded = vi.fn();
const onClose = vi.fn();
const CONFIRM = 'I confirm this outcome is based on my own review of the evidence.';
const show = () =>
  renderScreen(
    <RecordOutcomeModal open alertId="a1" reference="RA-2026-00031" evidence={[{ id: 'e1', description: 'Accident date (SAMPLE)' }]} onClose={onClose} onRecorded={onRecorded} />,
    investigator,
  );
function fill() {
  fireEvent.click(screen.getByLabelText('Extraction error corrected'));
  fireEvent.change(screen.getByLabelText(/Finding summary/), { target: { value: 'A typing error.' } });
  fireEvent.change(screen.getByLabelText(/Rationale/), { target: { value: 'Checked both documents.' } });
  fireEvent.change(screen.getByLabelText(/^Next action(?! due)/), { target: { value: 'None' } });
  fireEvent.click(screen.getByLabelText('Accident date (SAMPLE)'));
  fireEvent.click(screen.getByLabelText(CONFIRM));
}

describe('M3 Record outcome', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('T-US51-1 and T-M3-1 Save outcome needs a finding summary and the confirmation', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Save outcome' }));
    expect((await screen.findAllByText(TXT[4])).length).toBeGreaterThan(0);
    expect(screen.getByText(TXT[33])).toBeInTheDocument();
    expect(api.recordReview).not.toHaveBeenCalled();
  });

  it('T-US51-2 the footer names the recorder and the date', () => {
    show();
    expect(screen.getByText(/^Recorded by Ayesha Patel · \d{2} [A-Z][a-z]{2} \d{4}$/)).toBeInTheDocument();
  });

  it('T-US44-1 and T-M3-1 saves the outcome, shows TXT-34 and reports success', async () => {
    vi.mocked(api.recordReview).mockResolvedValue(undefined);
    show();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Save outcome' }));
    await waitFor(() =>
      expect(api.recordReview).toHaveBeenCalledWith({
        alertId: 'a1', outcome: 'extraction_error_corrected', findingSummary: 'A typing error.', rationale: 'Checked both documents.', evidenceIds: ['e1'], nextAction: 'None', nextActionDue: null, resultingStatus: 'RESOLVED', confirmed: true,
      }),
    );
    expect(await screen.findByText(TXT[34])).toBeInTheDocument();
    expect(onRecorded).toHaveBeenCalled();
  });

  it('T-M3-1 a server failure shows TXT-2 and stays open', async () => {
    vi.mocked(api.recordReview).mockRejectedValue(new Error('failed'));
    show();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Save outcome' }));
    expect(await screen.findByText(TXT[2])).toBeInTheDocument();
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('T-M3-1 while submitting the button is busy', async () => {
    vi.mocked(api.recordReview).mockReturnValue(new Promise(() => undefined));
    show();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Save outcome' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save outcome' })).toBeDisabled());
  });

  it('T-M3-1 offline shows TXT-1 and disables saving', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    show();
    expect(screen.getByText(TXT[1])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save outcome' })).toBeDisabled();
    spy.mockRestore();
  });
});
