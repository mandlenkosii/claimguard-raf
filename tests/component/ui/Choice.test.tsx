import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, RadioGroup, SegmentedControl, Toggle } from '@/components/ui/Choice';

describe('T-C-4 Checkbox, Radio, Toggle and SegmentedControl', () => {
  it('T-C-4 checkbox checked and unchecked', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox label="I accept the privacy notice" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'I accept the privacy notice' });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Checkbox label="I accept the privacy notice" checked onChange={onChange} />);
    expect(box).toBeChecked();
  });

  it('T-C-4 checkbox disabled and error states', () => {
    render(<Checkbox label="Consent" checked={false} disabled error="Please accept the privacy notice to continue." onChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'Consent' });
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Please accept the privacy notice to continue.')).toBeInTheDocument();
  });

  it('T-C-4 radio group selects one option', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Account type"
        name="account_type"
        value="claimant"
        options={[
          { value: 'claimant', label: 'Claimant' },
          { value: 'legal_practitioner', label: 'Legal practitioner' },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Claimant' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Legal practitioner' }));
    expect(onChange).toHaveBeenCalledWith('legal_practitioner');
  });

  it('T-C-4 radio group disabled and error states', () => {
    render(
      <RadioGroup
        legend="Account type"
        name="t"
        value=""
        disabled
        error="This field is required."
        options={[{ value: 'a', label: 'A' }]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled();
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
  });

  it('T-C-4 toggle is a switch that flips', () => {
    const onChange = vi.fn();
    render(<Toggle label="In-app notifications" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'In-app notifications' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('T-C-4 disabled toggle does not change', () => {
    const onChange = vi.fn();
    render(<Toggle label="In-app notifications" checked disabled onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'In-app notifications' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('T-C-4 segmented control marks the selected segment', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="View"
        value="list"
        options={[
          { value: 'list', label: 'List' },
          { value: 'board', label: 'Board' },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Board' }));
    expect(onChange).toHaveBeenCalledWith('board');
  });
});
