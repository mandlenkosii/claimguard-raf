import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper, type Step } from '@/components/ui/Stepper';

const steps: Step[] = [
  { id: 'draft', label: 'Draft', status: 'complete' },
  { id: 'documents_needed', label: 'Documents Needed', status: 'current' },
  { id: 'validation', label: 'Validation', status: 'upcoming' },
];

describe('T-C-18 Stepper', () => {
  it('T-C-18 horizontal workflow tracker highlights the current stage', () => {
    render(<Stepper label="Claim progress" variant="tracker" steps={steps} />);
    const list = screen.getByRole('list', { name: 'Claim progress' });
    expect(list).toHaveAttribute('data-orientation', 'horizontal');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveAttribute('data-status', 'complete');
    expect(items[2]).toHaveAttribute('data-status', 'upcoming');
  });

  it('T-C-18 vertical wizard numbers each step', () => {
    render(<Stepper label="New claim" variant="wizard" steps={steps} />);
    const list = screen.getByRole('list', { name: 'New claim' });
    expect(list).toHaveAttribute('data-orientation', 'vertical');
    expect(within(list).getByText('2')).toBeInTheDocument();
    expect(within(list).getByText('Documents Needed')).toBeInTheDocument();
  });

  it('T-C-18 vertical status history shows timestamps', () => {
    render(
      <Stepper
        label="Status history"
        variant="history"
        steps={[
          { id: 'a', label: 'Pending', status: 'complete', timestamp: '24 Feb 2026, 14:15' },
          { id: 'b', label: 'Responded', status: 'current', timestamp: '25 Feb 2026, 09:30' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Status history' });
    expect(list).toHaveAttribute('data-orientation', 'vertical');
    expect(within(list).getByText('25 Feb 2026, 09:30')).toBeInTheDocument();
  });
});
