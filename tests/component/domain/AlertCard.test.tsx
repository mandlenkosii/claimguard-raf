import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AlertCard } from '@/components/domain/AlertCard';

const alert = {
  id: 'a1', reference: 'RA-2026-00031', rule_id: 'RULE-003', rule_version: '1.0.0', title: 'Conflicting accident dates', explanation: 'The dates differ.',
  severity: 'HIGH', status: 'UNDER_REVIEW', indicator_type: 'date_inconsistency', created_at: '2026-02-24T10:00:00Z', assignee_name: 'Ayesha Patel', evidence_count: 2,
};

describe('T-C-26 AlertCard', () => {
  it('T-C-26 shows severity, title, rule, created, status, assignee, evidence count and a link', () => {
    render(<MemoryRouter><AlertCard alert={alert} /></MemoryRouter>);
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conflicting accident dates' })).toBeInTheDocument();
    expect(screen.getByText('RULE-003')).toBeInTheDocument();
    expect(screen.getByText('24 Feb 2026')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.getByText('Assigned: Ayesha Patel')).toBeInTheDocument();
    expect(screen.getByText('2 evidence items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in workspace' })).toHaveAttribute('href', '/raf/risk/a1');
  });

  it('T-C-26 an unassigned alert says so', () => {
    render(<MemoryRouter><AlertCard alert={{ ...alert, assignee_name: null, evidence_count: 1 }} /></MemoryRouter>);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('1 evidence item')).toBeInTheDocument();
  });
});
