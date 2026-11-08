import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/layouts/AppShell';
import { PublicLayout } from '@/layouts/PublicLayout';

const NOTICE = 'ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.';

describe('T-BR32-1 prototype notice at the very top', () => {
  it('T-BR32-1 PublicLayout shows the notice before anything else', () => {
    const { container } = render(
      <MemoryRouter>
        <PublicLayout>
          <p>Body</p>
        </PublicLayout>
      </MemoryRouter>,
    );
    const first = container.firstElementChild?.firstElementChild;
    expect(first).toHaveAttribute('role', 'note');
    expect(first).toHaveTextContent(NOTICE);
  });

  it('T-BR32-1 AppShell shows the notice before anything else', () => {
    const { container } = render(
      <MemoryRouter>
        <AppShell role="raf_officer" userName="Demo RAF Officer" unreadCount={0}>
          <p>Body</p>
        </AppShell>
      </MemoryRouter>,
    );
    const first = container.firstElementChild?.firstElementChild;
    expect(first).toHaveAttribute('role', 'note');
    expect(first).toHaveTextContent(NOTICE);
  });
});
