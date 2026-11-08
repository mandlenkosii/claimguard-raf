import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/app/App';

describe('T-SETUP-2 App', () => {
  it('T-SETUP-2 renders at / without errors', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(
      await screen.findByText('ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.'),
    ).toBeInTheDocument();
  });
});
