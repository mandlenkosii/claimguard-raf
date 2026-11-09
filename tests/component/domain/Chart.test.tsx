import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart } from '@/components/ui/Chart';

describe('T-C-30 BarChart', () => {
  it('T-C-30 draws each value, in words too, with the demo label', () => {
    render(<BarChart title="Claims by status" data={[{ label: 'Draft', value: 2 }, { label: 'Ready', value: 4 }]} demo />);
    expect(screen.getByRole('heading', { name: 'Claims by status' })).toBeInTheDocument();
    expect(screen.getByTestId('bar-Ready')).toHaveAttribute('data-percent', '100');
    expect(screen.getByTestId('bar-Draft')).toHaveAttribute('data-percent', '50');
    expect(screen.getByRole('table', { name: 'Claims by status' })).toBeInTheDocument();
    expect(screen.getByText('Demonstration data')).toBeInTheDocument();
  });

  it('T-C-30 shows the empty message when every value is zero', () => {
    render(<BarChart title="Claims by status" data={[{ label: 'Draft', value: 0 }]} />);
    expect(screen.getByText('No results for the selected filters.')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-Draft')).toBeNull();
  });
});
