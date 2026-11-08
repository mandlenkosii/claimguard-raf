import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

describe('S08 403', () => {
  it('T-S8-1 shows the message, Back to dashboard and Request access', () => {
    renderScreen(<AccessDeniedPage />, makeSession());
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument();
  });
});
