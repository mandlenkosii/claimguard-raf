import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SeverityChip } from '@/components/domain/SeverityChip';

describe('T-C-11 SeverityChip', () => {
  it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])('T-US40-1 %s shows text, colour and an icon', (severity) => {
    const { container } = render(<SeverityChip severity={severity} />);
    const chip = screen.getByText(severity).parentElement!;
    expect(chip).toHaveAttribute('data-severity', severity);
    expect(chip.className).toContain(`severity-${severity.toLowerCase()}`);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
