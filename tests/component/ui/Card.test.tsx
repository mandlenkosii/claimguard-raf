import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, KpiCard } from '@/components/ui/Card';

describe('T-C-14 Card and KpiCard', () => {
  it('T-C-14 default card renders a title and content', () => {
    render(
      <Card title="Open requests">
        <p>Body</p>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Open requests' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('T-C-14 KPI card shows label and value', () => {
    render(<KpiCard label="Claims in validation" value={12} />);
    expect(screen.getByText('Claims in validation')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('Demonstration data')).toBeNull();
  });

  it.each(['up', 'down'] as const)('T-C-14 KPI card shows a %s trend arrow with text', (direction) => {
    const { container } = render(
      <KpiCard label="Ready claims" value={4} trend={{ direction, label: '2 since last week' }} />,
    );
    expect(screen.getByText('2 since last week')).toBeInTheDocument();
    expect(container.querySelector(`[data-trend="${direction}"] svg`)).not.toBeNull();
  });

  it('T-C-14 KPI card shows the "Demonstration data" label', () => {
    render(<KpiCard label="Open issues" value={7} demo />);
    expect(screen.getByText('Demonstration data')).toBeInTheDocument();
  });
});
