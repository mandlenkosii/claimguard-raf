import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrototypeNotice } from '@/components/domain/PrototypeNotice';

describe('T-C-6 PrototypeNotice', () => {
  it('T-C-6 renders the exact full notice text and the short mobile text', () => {
    render(<PrototypeNotice />);
    expect(
      screen.getByText('ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Concept prototype · Demo data only')).toBeInTheDocument();
  });

  it.each(['public', 'app'] as const)('T-C-6 renders the %s variant', (variant) => {
    render(<PrototypeNotice variant={variant} />);
    expect(screen.getByRole('note')).toHaveAttribute('data-variant', variant);
  });
});
