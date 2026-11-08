import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HowItWorksPage } from '@/pages/public/HowItWorksPage';
import { renderPublicPage } from './renderPage';

describe('T-S3-1 How it works page', () => {
  it('T-S3-1 shows the six numbered process steps', () => {
    renderPublicPage(<HowItWorksPage />);
    const steps = within(screen.getByTestId('process-steps')).getAllByTestId('process-step');
    expect(steps.map((step) => within(step).getByRole('heading').textContent)).toEqual([
      'Create a claim',
      'Upload documents',
      'Automated checks',
      'Readiness score',
      'Risk review',
      'Resolution and audit trail',
    ]);
  });

  it('T-S3-1 the first role journey is selected by default', () => {
    renderPublicPage(<HowItWorksPage />);
    expect(screen.getByRole('tab', { name: 'RAF claims officer' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('listitem')[0]).toHaveTextContent('Sign in and open permitted claims queue.');
  });

  it("T-S3-1 selecting a role-journey tab shows that role's numbered steps", () => {
    renderPublicPage(<HowItWorksPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Claimant' }));
    expect(screen.getByRole('tab', { name: 'Claimant' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'Claimant' });
    const list = within(panel).getByRole('list');
    expect(list.tagName).toBe('OL');
    const steps = within(list).getAllByRole('listitem');
    expect(steps).toHaveLength(9);
    expect(steps[0]).toHaveTextContent('Register and sign in.');
    expect(steps[8]).toHaveTextContent('Review the updated timeline.');
  });

  it('T-S3-1 offers the five PRD journeys', () => {
    renderPublicPage(<HowItWorksPage />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'RAF claims officer',
      'Claimant',
      'Legal practitioner',
      'Risk investigator',
      'Manager',
    ]);
  });
});
