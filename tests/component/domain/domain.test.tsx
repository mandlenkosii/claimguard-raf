import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ClaimHeader } from '@/components/domain/ClaimHeader';
import { RestrictedNotice } from '@/components/domain/RestrictedNotice';
import { CLAIM_STATUSES, StatusChip } from '@/components/domain/StatusChip';
import { Timeline } from '@/components/domain/Timeline';
import { Stepper } from '@/components/ui/Stepper';
import { timelineEvents } from '../../fixtures/claims';

describe('Phase 4 domain components', () => {
  it.each(Object.entries(CLAIM_STATUSES))('T-C-10 StatusChip shows %s as text', (status, label) => {
    render(<StatusChip status={status} />);
    expect(screen.getByText(label)).toHaveAttribute('data-status', status);
  });

  it('T-C-18 Stepper variants still render', () => {
    render(<Stepper label="Steps" variant="wizard" steps={[{ id: 'a', label: 'A', status: 'current' }]} />);
    expect(screen.getByRole('list', { name: 'Steps' })).toBeInTheDocument();
  });

  it('T-C-22 Timeline groups by date and greys blocked actions', () => {
    render(<Timeline events={timelineEvents} />);
    expect(screen.getAllByTestId('timeline-group')).toHaveLength(2);
    const blocked = screen.getByText('Status change to Ready blocked').closest('[data-event]')!;
    expect(blocked).toHaveAttribute('data-blocked', 'true');
    expect(within(blocked as HTMLElement).getByText('Demo RAF Officer')).toBeInTheDocument();
    expect(within(blocked as HTMLElement).getByText('RAF officer')).toBeInTheDocument();
  });

  it('T-C-24 ClaimHeader shows breadcrumb, reference, title, status, readiness and blocking chip', () => {
    render(
      <MemoryRouter>
        <ClaimHeader backTo="/claims" backLabel="Claims" reference="CG-2026-000142" title="Sipho Ndlovu" status="validation" readinessScore={85} blockingCount={1} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Claims/ })).toHaveAttribute('href', '/claims');
    expect(screen.getByText('CG-2026-000142')).toHaveClass('font-mono');
    expect(screen.getByRole('heading', { name: 'Sipho Ndlovu' })).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('85% ready')).toBeInTheDocument();
    expect(screen.getByText('1 blocking issue')).toBeInTheDocument();
  });

  it('T-C-33 RestrictedNotice has an icon, the explanation and Back to dashboard', () => {
    const { container } = render(
      <MemoryRouter>
        <RestrictedNotice message="You don't have permission to view this claim" backTo="/dashboard" />
      </MemoryRouter>,
    );
    expect(screen.getByText("You don't have permission to view this claim")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
