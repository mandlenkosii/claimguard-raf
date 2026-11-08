import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from '@/components/domain/Logo';

describe('T-C-7 Logo', () => {
  it('T-C-7 renders the shield logo and the "ClaimGuard RAF" wordmark', () => {
    const { container } = render(<Logo />);
    expect(screen.getByText('ClaimGuard RAF')).toBeInTheDocument();
    expect(container.querySelector('[data-logo-shield] svg')).not.toBeNull();
  });

  it('T-C-7 never uses an image (no official RAF logo or crest)', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('T-C-7 can hide the wordmark for the collapsed icon rail', () => {
    render(<Logo compact />);
    expect(screen.getByText('ClaimGuard RAF')).toHaveClass('sr-only');
  });
});
