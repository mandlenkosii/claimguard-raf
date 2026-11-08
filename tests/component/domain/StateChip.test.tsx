import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StateChip, type StateKind } from '@/components/domain/StateChip';

const CASES: Array<[StateKind, string, string]> = [
  ['document', 'uploaded', 'Uploaded'],
  ['document', 'processing', 'Processing'],
  ['document', 'processed', 'Processed'],
  ['document', 'failed', 'Failed'],
  ['document', 'review_required', 'Review required'],
  ['issue', 'open', 'Open'],
  ['issue', 'under_review', 'Under review'],
  ['issue', 'resolved', 'Resolved'],
  ['issue', 'dismissed', 'Dismissed'],
  ['alert', 'OPEN', 'Open'],
  ['alert', 'UNDER_REVIEW', 'Under review'],
  ['alert', 'ESCALATED', 'Escalated'],
  ['alert', 'RESOLVED', 'Resolved'],
  ['alert', 'DISMISSED', 'Dismissed'],
  ['request', 'pending', 'Pending'],
  ['request', 'responded', 'Responded'],
  ['request', 'under_review', 'Under review'],
  ['request', 'closed', 'Closed'],
  ['request', 'overdue', 'Overdue'],
  ['confidence', 'high', 'High'],
  ['confidence', 'medium', 'Medium'],
  ['confidence', 'low', 'Low'],
  ['account', 'active', 'Active'],
  ['account', 'invited', 'Invited'],
  ['account', 'suspended', 'Suspended'],
  ['account', 'disabled', 'Disabled'],
];

describe('T-C-12 StateChip', () => {
  it.each(CASES)('T-C-12 %s %s shows as text', (kind, state, label) => {
    render(<StateChip kind={kind} state={state} />);
    expect(screen.getByText(label).closest('[data-state]')).toHaveAttribute('data-state', state);
  });

  it('T-NFR-3 Processing shows a spinner', () => {
    const { container } = render(<StateChip kind="document" state="processing" />);
    expect(container.querySelector('[data-spinner]')).not.toBeNull();
  });
});
