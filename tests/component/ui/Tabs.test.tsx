import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/ui/Tabs';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents', count: 6 },
  { id: 'risk', label: 'Risk', locked: true },
  { id: 'audit', label: 'Audit', locked: true, hidden: true },
];

describe('T-C-17 Tabs', () => {
  it('T-C-17 marks the active tab and reports changes', () => {
    const onChange = vi.fn();
    render(<Tabs label="Claim workspace" tabs={tabs} activeId="overview" onChange={onChange} />);
    expect(screen.getByRole('tablist', { name: 'Claim workspace' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /Documents/ }));
    expect(onChange).toHaveBeenCalledWith('documents');
  });

  it('T-C-17 shows a count badge', () => {
    render(<Tabs label="Claim workspace" tabs={tabs} activeId="overview" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /Documents/ })).toHaveTextContent('6');
  });

  it('T-C-17 shows a lock icon on permission-controlled tabs', () => {
    render(<Tabs label="Claim workspace" tabs={tabs} activeId="overview" onChange={() => {}} />);
    const risk = screen.getByRole('tab', { name: /Risk/ });
    expect(risk).toHaveAttribute('data-locked', 'true');
    expect(risk.querySelector('svg')).not.toBeNull();
  });

  it('T-C-17 hidden tabs are not rendered at all', () => {
    render(<Tabs label="Claim workspace" tabs={tabs} activeId="overview" onChange={() => {}} />);
    expect(screen.queryByRole('tab', { name: /Audit/ })).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('T-C-17 arrow keys move between tabs', () => {
    const onChange = vi.fn();
    render(<Tabs label="Claim workspace" tabs={tabs} activeId="overview" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('documents');
  });
});
