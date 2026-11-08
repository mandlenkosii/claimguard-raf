import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '@/pages/public/AboutPage';
import { renderPublicPage } from './renderPage';

describe('T-S2-1 About page', () => {
  it('T-S2-1 shows the vision card with the PRD 1.2 vision', () => {
    renderPublicPage(<AboutPage />);
    expect(within(screen.getByTestId('vision-card')).getByText(/helps people identify claim-information problems earlier/)).toBeInTheDocument();
  });

  it('T-S2-1 shows 8 objective cards', () => {
    renderPublicPage(<AboutPage />);
    expect(screen.getAllByTestId('objective-card')).toHaveLength(8);
  });

  it('T-S2-1 shows the "What it does not do" list from the design', () => {
    renderPublicPage(<AboutPage />);
    const section = screen.getByTestId('does-not-do');
    expect(within(section).getByRole('heading', { name: 'What ClaimGuard does not do' })).toBeInTheDocument();
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Does not approve or reject claims');
    expect(items[1]).toHaveTextContent('Does not decide fraud');
  });
});
