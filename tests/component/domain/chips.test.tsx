import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SeverityChip } from '@/components/domain/SeverityChip';
import { StateChip, type StateKind } from '@/components/domain/StateChip';
import { CLAIM_STATUSES, StatusChip } from '@/components/domain/StatusChip';

const STATES: Array<[StateKind, string, string]> = [
  ['document', 'processed', 'Processed'],
  ['issue', 'under_review', 'Under review'],
  ['alert', 'ESCALATED', 'Escalated'],
  ['request', 'overdue', 'Overdue'],
  ['confidence', 'low', 'Low'],
  ['account', 'suspended', 'Suspended'],
];

describe('T-NFR-7 chips are text, not colour alone', () => {
  it.each(STATES)('%s %s reads as text', (kind, state, label) => {
    render(<StateChip kind={kind} state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each(Object.entries(CLAIM_STATUSES))('claim status %s reads as text', (status, label) => {
    render(<StatusChip status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])('severity %s reads as text', (severity) => {
    render(<SeverityChip severity={severity} />);
    expect(screen.getByText(severity)).toBeInTheDocument();
  });
});
