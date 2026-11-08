import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordField } from '@/components/ui/PasswordField';

describe('T-C-5 PasswordField and StrengthMeter', () => {
  it('T-C-5 show/hide toggle switches the input type', () => {
    render(<PasswordField label="Password" name="password" value="secret12" onChange={() => {}} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('T-C-5 requirement checklist follows TXT-7 (8 characters, a letter, a number)', () => {
    render(<PasswordField label="Password" name="password" value="abc" showRequirements onChange={() => {}} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['At least 8 characters', 'A letter', 'A number']);
    expect(items.map((item) => item.getAttribute('data-met'))).toEqual(['false', 'true', 'false']);
  });

  it('T-C-5 strength meter counts the requirements met', () => {
    const { rerender } = render(<PasswordField label="Password" name="password" value="abc" showRequirements onChange={() => {}} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '1');
    rerender(<PasswordField label="Password" name="password" value="abcdefg1" showRequirements onChange={() => {}} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '3');
  });
});
