import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { IssueCard } from '@/components/domain/IssueCard';
import type { ClaimIssue } from '@/features/readiness/api';

const issue: ClaimIssue = {
  id: 'i1', rule_id: 'RULE-001', issue_key: 'missing:x', title: 'Hospital medical report missing', explanation: 'A required document category has not been supplied.',
  corrective_action: 'Request or upload the document.', impact: 'blocking', status: 'open', dismiss_reason: null, classification: null,
  evidence: [{ source: 'Hospital medical report', field: 'category', document_id: 'd1' }],
};
const conflict: ClaimIssue = {
  ...issue, id: 'i2', rule_id: 'RULE-002', issue_key: 'conflict:full_name', title: 'Claimant name differs', impact: 'warning',
  evidence: [{ source: 'Identity document', field: 'full_name', value: 'Sipho M. Ndlovu' }, { source: 'Hospital medical report', field: 'full_name', value: 'S. Ndhlovu' }],
};
const show = (item: ClaimIssue, props: Partial<Parameters<typeof IssueCard>[0]> = {}) =>
  render(<MemoryRouter><IssueCard issue={item} canAct documentsPath="/claims/c/documents" onUpdate={vi.fn()} {...props} /></MemoryRouter>);

describe('T-C-25 and T-US31-1 IssueCard', () => {
  it('T-US31-1 shows rule chip, title, explanation, evidence, action and status', () => {
    show(issue);
    expect(screen.getByText('RULE-001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hospital medical report missing' })).toBeInTheDocument();
    expect(screen.getByText('A required document category has not been supplied.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hospital medical report' })).toHaveAttribute('href', '/claims/c/documents');
    expect(screen.getByRole('link', { name: 'Upload document' })).toHaveAttribute('href', '/claims/c/documents');
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('T-C-25 the comparison variant shows both sources and the two classification buttons', () => {
    const onUpdate = vi.fn();
    show(conflict, { onUpdate });
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'This is an extraction error' }));
    expect(onUpdate).toHaveBeenCalledWith({ issueId: 'i2', classification: 'extraction_error' });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as genuine discrepancy' }));
    expect(onUpdate).toHaveBeenCalledWith({ issueId: 'i2', classification: 'genuine_discrepancy' });
  });

  it('T-US37 Resolve sends the status and Dismiss needs a reason', () => {
    const onUpdate = vi.fn();
    show(issue, { onUpdate });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as resolved' }));
    expect(onUpdate).toHaveBeenCalledWith({ issueId: 'i1', status: 'resolved' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dismissal' }));
    expect(screen.getByText('Please give a reason.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason for dismissal/), { target: { value: 'Expected duplicate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dismissal' }));
    expect(onUpdate).toHaveBeenCalledWith({ issueId: 'i1', status: 'dismissed', reason: 'Expected duplicate' });
  });

  it('T-SEC-13 a role that may not act sees no issue actions', () => {
    show(conflict, { canAct: false });
    expect(screen.queryByRole('button', { name: 'Mark as resolved' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'This is an extraction error' })).toBeNull();
  });

  it('T-US37 a resolved issue offers no further actions', () => {
    show({ ...issue, status: 'resolved' });
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as resolved' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Upload document' })).toBeNull();
  });
});
