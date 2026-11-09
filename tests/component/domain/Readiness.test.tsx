import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryBar, ReadinessRing } from '@/components/domain/Readiness';
import { ComparisonTable } from '@/components/domain/ComparisonTable';

describe('T-C-13 ReadinessRing and CategoryBar', () => {
  it.each(['large', 'mini'] as const)('T-C-13 the %s ring shows the value', (size) => {
    render(<ReadinessRing value={84} size={size} />);
    expect(screen.getByRole('img', { name: 'Readiness 84%' })).toHaveAttribute('data-size', size);
    expect(screen.getByText('84%')).toBeInTheDocument();
  });

  it.each([0, 100])('T-C-13 the ring accepts %s', (value) => {
    render(<ReadinessRing value={value} size="large" />);
    expect(screen.getByText(`${value}%`)).toBeInTheDocument();
  });

  it('T-C-13 the category bar shows value and weight and expands', () => {
    render(<CategoryBar label="Documentation completeness" value={75} weight={30}>Details here</CategoryBar>);
    expect(screen.getByText('Documentation completeness')).toBeInTheDocument();
    expect(screen.getByText('Weight 30%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.queryByText('Details here')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show details for Documentation completeness' }));
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });
});

describe('T-C-27 ComparisonTable', () => {
  it('T-C-27 shows Field, Source A, Source B and Match or Mismatch as text', () => {
    render(<ComparisonTable rows={[{ field: 'Full name', sourceA: 'Sipho M. Ndlovu', sourceB: 'S. Ndhlovu', match: false }, { field: 'ID number', sourceA: 'SYN1', sourceB: 'SYN1', match: true }]} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Field', 'Source A', 'Source B', 'Match']);
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
    expect(screen.getByText('Match', { selector: 'td span' })).toBeInTheDocument();
  });
});
