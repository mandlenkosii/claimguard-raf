import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import type { AuthSession } from '@/app/auth';
import { AppProviders } from '@/app/providers';

/** A fictional signed-in user, built from the PRD 12.2 sample data set. */
export function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'claimant.demo@example.com',
    firstName: 'Thandiwe',
    surname: 'Mokoena',
    displayName: 'Thandiwe Mokoena',
    accountType: 'claimant',
    accountStatus: 'active',
    practitionerStatus: null,
    roles: ['claimant'],
    capabilities: ['claims.view'],
    ...overrides,
  };
}

/** Renders one screen with the real providers and a router. */
export function renderScreen(ui: ReactElement, session: AuthSession | null = null, path = '/') {
  return render(
    <AppProviders session={session}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
}
