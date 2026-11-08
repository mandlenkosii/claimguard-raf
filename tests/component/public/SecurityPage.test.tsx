import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SecurityPage } from '@/pages/public/SecurityPage';
import { renderPublicPage } from './renderPage';

describe('T-S4-1 Security page', () => {
  it('T-S4-1 shows 8 principle cards', () => {
    renderPublicPage(<SecurityPage />);
    expect(screen.getAllByTestId('principle-card')).toHaveLength(8);
  });

  it('T-S4-1 shows the prototype disclaimer', () => {
    renderPublicPage(<SecurityPage />);
    expect(
      screen.getByText('This prototype uses fictional data. It is not a legal compliance certification.'),
    ).toBeInTheDocument();
  });

  it('T-S4-1 signed links expire after 5 minutes, as in the plan (BR27)', () => {
    renderPublicPage(<SecurityPage />);
    expect(document.body.textContent).toMatch(/5 minutes/);
    expect(document.body.textContent).not.toMatch(/15 minutes|900/);
  });
});
