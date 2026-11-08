import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PublicLayout } from '@/layouts/PublicLayout';

function renderLayout() {
  return render(
    <MemoryRouter>
      <PublicLayout>
        <p>Page body</p>
      </PublicLayout>
    </MemoryRouter>,
  );
}

describe('T-C-8 PublicNav and Footer', () => {
  it('T-C-8 the public nav links About, How it works and Security', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Public' });
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works');
    expect(within(nav).getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security');
  });

  it('T-C-8 shows Sign in (ghost) and Register (primary)', () => {
    renderLayout();
    const signIn = screen.getByRole('link', { name: 'Sign in' });
    const register = screen.getByRole('link', { name: 'Register' });
    expect(signIn).toHaveAttribute('href', '/login');
    expect(signIn).toHaveAttribute('data-variant', 'ghost');
    expect(register).toHaveAttribute('href', '/register');
    expect(register).toHaveAttribute('data-variant', 'primary');
  });

  it('T-C-8 the logo links home and the page body renders', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'ClaimGuard RAF home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });

  it('T-C-8 the footer shows the not-affiliated disclaimer', () => {
    renderLayout();
    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer).getByText(/Concept prototype — not affiliated with or endorsed by the Road Accident Fund/),
    ).toBeInTheDocument();
  });
});
