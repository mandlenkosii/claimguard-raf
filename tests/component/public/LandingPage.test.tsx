import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from '@/pages/public/LandingPage';
import { renderPublicPage } from './renderPage';

const DESIGN_ORDER = [
  'prototype-notice',
  'public-nav',
  'hero',
  'problem-strip',
  'flow',
  'roles',
  'principles',
  'human-decision',
  'footer',
];

describe('T-S1-1 Landing page', () => {
  it('T-S1-1 sections appear in design order', () => {
    renderPublicPage(<LandingPage />);
    const sections = DESIGN_ORDER.map((id) => screen.getByTestId(id));
    for (let i = 1; i < sections.length; i += 1) {
      const previous = sections[i - 1]!;
      const current = sections[i]!;
      expect(previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('T-S1-1 hero shows the headline', () => {
    renderPublicPage(<LandingPage />);
    expect(
      within(screen.getByTestId('hero')).getByRole('heading', {
        level: 1,
        name: 'Catch claim problems early. Resolve them with evidence.',
      }),
    ).toBeInTheDocument();
  });

  it('T-S1-1 the flow has 7 steps and there are six role cards', () => {
    renderPublicPage(<LandingPage />);
    expect(within(screen.getByTestId('flow')).getAllByRole('listitem')).toHaveLength(7);
    expect(within(screen.getByTestId('roles')).getAllByTestId('role-card')).toHaveLength(6);
  });

  it('T-S1-1 footer shows the not-affiliated disclaimer', () => {
    renderPublicPage(<LandingPage />);
    expect(
      within(screen.getByTestId('footer')).getByText(
        /Concept prototype — not affiliated with or endorsed by the Road Accident Fund/,
      ),
    ).toBeInTheDocument();
  });

  it('T-S1-1 shows no invented performance statistics', () => {
    renderPublicPage(<LandingPage />);
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);
  });
});
