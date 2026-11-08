import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RestrictedClaimView } from '@/pages/claims/workspace/RestrictedClaimView';
import { makeSession, renderScreen } from '../../fixtures/auth';

describe('S25 Restricted view', () => {
  it('T-S25-1 with no access it shows the message and Back to dashboard', () => {
    renderScreen(<RestrictedClaimView />, makeSession());
    expect(screen.getByText("You don't have permission to view this claim")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('T-S25-1 a manager sees summary data only', () => {
    renderScreen(
      <RestrictedClaimView
        summary={{ id: 'c', reference: 'CG-2026-000142', status: 'validation', readiness_score: 85, blocking_count: 1, warning_count: 2, open_request_count: 3, assignment_count: 1, created_at: '2026-01-12T10:00:00Z', updated_at: '2026-02-25T10:00:00Z', submitted_at: null }}
      />,
      makeSession({ roles: ['manager'] }),
    );
    expect(screen.getByText('CG-2026-000142')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Risk/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Audit/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Ndlovu/);
  });
});
