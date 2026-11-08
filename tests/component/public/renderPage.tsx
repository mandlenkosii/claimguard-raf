import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';

/** Renders a public page inside its real layout, as the router does. */
export function renderPublicPage(page: ReactElement) {
  return render(
    <MemoryRouter>
      <PublicLayout>{page}</PublicLayout>
    </MemoryRouter>,
  );
}
