import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { TXT } from '@/lib/format/messages';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValid() {
  change(/First name/, 'Test');
  change(/Surname/, 'Person');
  change(/^Email/, 'test.person@example.org');
  change(/^Password/, 'abcdefg1');
  change(/Confirm password/, 'abcdefg1');
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('S06 Register', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US1-1 a claimant registers with valid details and consent', async () => {
    vi.mocked(api.signUp).mockResolvedValue({ ok: true, hasSession: false });
    renderScreen(<RegisterPage />);
    fillValid();
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(await screen.findByText(TXT[9])).toBeInTheDocument();
    expect(api.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'claimant', firstName: 'Test', surname: 'Person', email: 'test.person@example.org', password: 'abcdefg1' }),
    );
  });

  it('T-US1-2 choosing Legal practitioner shows firm fields and submits them', async () => {
    vi.mocked(api.signUp).mockResolvedValue({ ok: true, hasSession: false });
    renderScreen(<RegisterPage />);
    expect(screen.queryByLabelText(/Firm name/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Legal practitioner' }));
    change(/Firm name/, 'Test Firm');
    change(/Practice number/, 'LPC-1');
    fillValid();
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    await waitFor(() =>
      expect(api.signUp).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'legal_practitioner', firmName: 'Test Firm', practiceNumber: 'LPC-1' })),
    );
  });

  it('T-US1-3 only claimant and legal practitioner can be chosen', () => {
    renderScreen(<RegisterPage />);
    expect(screen.getAllByRole('radio').map((option) => option.textContent)).toEqual(['Claimant', 'Legal practitioner']);
  });

  it('T-US1-4 without consent it does not submit and TXT-8 shows', () => {
    renderScreen(<RegisterPage />);
    fillValid();
    submit();
    expect(screen.getByText(TXT[8])).toBeInTheDocument();
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it('T-S6-1 mismatched passwords show TXT-6 with an icon', () => {
    renderScreen(<RegisterPage />);
    fillValid();
    change(/Confirm password/, 'different1');
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    const error = screen.getByText(TXT[6]);
    expect(error.parentElement?.querySelector('svg')).not.toBeNull();
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it('T-S6-1 a weak password shows TXT-7', () => {
    renderScreen(<RegisterPage />);
    fillValid();
    change(/^Password/, 'abc');
    change(/Confirm password/, 'abc');
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(screen.getByText(TXT[7])).toBeInTheDocument();
  });

  it('T-S6 required and email errors use the catalogue', () => {
    renderScreen(<RegisterPage />);
    change(/^Email/, 'name@');
    submit();
    expect(screen.getAllByText(TXT[4]).length).toBeGreaterThan(0);
    expect(screen.getByText(TXT[5])).toBeInTheDocument();
  });

  it('T-S6 an unexpected server error shows TXT-2', async () => {
    vi.mocked(api.signUp).mockResolvedValue({ ok: false, reason: 'error' });
    renderScreen(<RegisterPage />);
    fillValid();
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(await screen.findByText(TXT[2])).toBeInTheDocument();
  });
});
