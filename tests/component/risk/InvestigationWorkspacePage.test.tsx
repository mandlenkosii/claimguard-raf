import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/risk/api';
import { InvestigationWorkspacePage } from '@/pages/risk/InvestigationWorkspacePage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/risk/api');

const evidence = (id: string, source: string, field: string, value: string): api.AlertEvidence => ({
  id, description: `${source}: ${value}`, source, field, value, document_id: `doc-${id}`, version_id: `ver-${id}`, filename: `${id}_SAMPLE.pdf`, storage_path: `claims/c/${id}.pdf`, mime_type: 'application/pdf', source_page: 1,
});
const data: api.AlertWorkspace = {
  alert: { id: 'a1', reference: 'RA-2026-00031', title: 'Conflicting accident dates', explanation: 'The accident report and hospital record differ.', severity: 'HIGH', status: 'UNDER_REVIEW', indicator_type: 'date_inconsistency', created_at: '2026-02-24T10:00:00Z', assigned_to: 'u1', assignee_name: 'Ayesha Patel' },
  claim: { id: 'c1', reference: 'CG-2026-000144', status: 'raf_review', claimant_name: 'Lerato Molefe' },
  rule: { id: 'RULE-003', name: 'Date inconsistency', version: '1.0.0' },
  evidence: [evidence('e1', 'Accident report', 'accident_date', '2026-03-12'), evidence('e2', 'Hospital medical report', 'admission_date', '2026-03-21')],
  documents: [{ id: 'd1', filename: 'accident_report_SAMPLE.pdf', category_name: 'Accident report' }],
  issues: [{ id: 'i1', rule_id: 'RULE-003', title: 'Accident dates differ between documents', status: 'open' }],
  history: [{ id: 'h1', change_type: 'status', old_value: 'OPEN', new_value: 'UNDER_REVIEW', actor_name: 'Ayesha Patel', reason: null, created_at: '2026-02-25T10:00:00Z' }],
  notes: [{ id: 'n1', body: 'Initial finding.', author_name: 'Ayesha Patel', author_role: 'investigator', corrects_note_id: null, created_at: '2026-02-25T11:00:00Z' }],
  review: null,
  investigators: [{ id: 'u1', name: 'Ayesha Patel' }, { id: 'u2', name: 'Second Investigator' }],
  can_assign: true,
};
const investigator = makeSession({ userId: 'u1', displayName: 'Ayesha Patel', roles: ['investigator'] });
const show = () => renderScreen(<Routes><Route path="/raf/risk/:id" element={<InvestigationWorkspacePage />} /></Routes>, investigator, '/raf/risk/a1');

describe('S36 Investigation workspace', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US41-1 explains why the alert was raised, with rule, version and evidence', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    show();
    const why = await screen.findByTestId('why-raised');
    expect(within(why).getByRole('heading', { name: 'Why this alert was raised' })).toBeInTheDocument();
    expect(within(why).getByText('RULE-003 v1.0.0')).toBeInTheDocument();
    expect(within(why).getByText('The accident report and hospital record differ.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accident report: 2026-03-12' })).toBeInTheDocument();
  });

  it('T-US48-1 shows severity, comparison, related documents, issues and history', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    show();
    expect(await screen.findByText('HIGH')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Field', 'Source A', 'Source B', 'Match']);
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
    expect(screen.getByText('accident_report_SAMPLE.pdf')).toBeInTheDocument();
    expect(screen.getByText('Accident dates differ between documents')).toBeInTheDocument();
    const history = screen.getByTestId('alert-history');
    expect(within(history).getByRole('heading', { name: 'Alert history' })).toBeInTheDocument();
    expect(within(history).getByText('Status: Open → Under review')).toBeInTheDocument();
  });

  it('T-US51-4 shows that closing an alert does not close the claim', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    show();
    expect(await screen.findByText('Closing this alert does not close or reject the claim. Human decision required.')).toBeInTheDocument();
  });

  it('T-US49-1 adds a note and shows TXT-32', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    vi.mocked(api.addNote).mockResolvedValue(undefined);
    show();
    fireEvent.change(await screen.findByLabelText(/Add a note/), { target: { value: 'New finding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith({ alertId: 'a1', body: 'New finding', correctsNoteId: null }));
    expect(await screen.findByText('Note added.')).toBeInTheDocument();
  });

  it('T-US49-2 and T-EDGE-19 a correction links to the original, which stays visible', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue({ ...data, notes: [...data.notes, { id: 'n2', body: 'Corrected finding.', author_name: 'Ayesha Patel', author_role: 'investigator', corrects_note_id: 'n1', created_at: '2026-02-26T11:00:00Z' }] });
    vi.mocked(api.addNote).mockResolvedValue(undefined);
    show();
    expect(await screen.findByText('Initial finding.')).toBeInTheDocument();
    expect(screen.getByText('Corrected finding.')).toBeInTheDocument();
    expect(screen.getByText('Correction to an earlier note')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add correction' })[0]!);
    fireEvent.change(screen.getByLabelText(/Add a note/), { target: { value: 'Fix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith({ alertId: 'a1', body: 'Fix', correctsNoteId: 'n1' }));
  });

  it('T-S36 an empty note is refused', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Add note' }));
    expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    expect(api.addNote).not.toHaveBeenCalled();
  });

  it('T-US50-1 Escalate needs a reason and sends it', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    vi.mocked(api.updateAlert).mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Escalate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Please give a reason.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Needs a senior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.updateAlert).toHaveBeenCalledWith({ alertId: 'a1', status: 'ESCALATED', reason: 'Needs a senior' }));
    expect(await screen.findByText('Alert updated.')).toBeInTheDocument();
  });

  it('T-US43-1 assigns the alert to a chosen investigator', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    vi.mocked(api.updateAlert).mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    fireEvent.change(screen.getByLabelText(/Investigator/), { target: { value: 'u2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.updateAlert).toHaveBeenCalledWith({ alertId: 'a1', assignedTo: 'u2' }));
  });

  it('T-US42-1 an open alert offers Start review and not Record outcome', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue({ ...data, alert: { ...data.alert, status: 'OPEN' } });
    vi.mocked(api.updateAlert).mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Start review' }));
    await waitFor(() => expect(api.updateAlert).toHaveBeenCalledWith({ alertId: 'a1', status: 'UNDER_REVIEW' }));
    expect(screen.queryByRole('button', { name: 'Record outcome' })).toBeNull();
  });

  it('T-S36 a closed alert offers no actions and shows its outcome', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue({
      ...data,
      alert: { ...data.alert, status: 'RESOLVED' },
      review: { outcome: 'extraction_error_corrected', finding_summary: 'A typing error.', rationale: 'Checked it.', next_action: 'None', next_action_due: null, resulting_status: 'RESOLVED', recorder_name: 'Ayesha Patel', recorded_at: '2026-02-27T10:00:00Z' },
    });
    show();
    expect(await screen.findByText('A typing error.')).toBeInTheDocument();
    expect(screen.getByText('Extraction error corrected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escalate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record outcome' })).toBeNull();
  });

  it('T-US48-2 clicking evidence opens its source at the field', async () => {
    vi.mocked(api.getAlertWorkspace).mockResolvedValue(data);
    vi.mocked(api.getPreviewUrl).mockResolvedValue(null);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Hospital medical report: 2026-03-21' }));
    expect(await screen.findByText('e2_SAMPLE.pdf')).toBeInTheDocument();
    expect(screen.getByText('Admission date · Page 1')).toBeInTheDocument();
  });

  it('T-SEC-14 no access shows access denied', async () => {
    vi.mocked(api.getAlertWorkspace).mockRejectedValue({ code: '42501' });
    show();
    expect(await screen.findByRole('heading', { name: /access/i })).toBeInTheDocument();
  });

  it('T-S36 the error state retries', async () => {
    vi.mocked(api.getAlertWorkspace).mockRejectedValue(new Error('failed'));
    show();
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
