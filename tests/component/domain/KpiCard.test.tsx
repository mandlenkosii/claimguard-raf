import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiCard } from '@/components/ui/Card';

describe('T-C-14 KpiCard', () => {
  it('T-C-14 shows the value and the demo label', () => {
    render(<KpiCard label="Open requests" value={6} demo />);
    expect(screen.getByText('Open requests')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Demonstration data')).toBeInTheDocument();
  });

  it('T-C-14 the label is optional', () => {
    render(<KpiCard label="Open requests" value={0} />);
    expect(screen.queryByText('Demonstration data')).toBeNull();
  });
});
