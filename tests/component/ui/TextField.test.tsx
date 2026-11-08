import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea, TextField } from '@/components/ui/TextField';
import { TXT } from '@/lib/format/messages';

describe('T-C-2 TextField and Textarea', () => {
  it('T-C-2 default field is labelled and reports changes', () => {
    const onChange = vi.fn();
    render(<TextField label="First name" name="first_name" value="" onChange={onChange} />);
    const input = screen.getByLabelText('First name');
    fireEvent.change(input, { target: { value: 'Thandiwe' } });
    expect(onChange).toHaveBeenCalledWith('Thandiwe');
  });

  it('T-C-2 required field shows an asterisk and is required', () => {
    render(<TextField label="Email" name="email" required value="" onChange={() => {}} />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('T-C-2 helper text describes the field', () => {
    render(<TextField label="Mobile" name="mobile" helperText="Used for claim updates" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Mobile');
    const helper = screen.getByText('Used for claim updates');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helper.id));
  });

  it('T-C-2 error shows an icon and text and marks the field invalid', () => {
    render(<TextField label="Email" name="email" error={TXT[5]} value="x" onChange={() => {}} />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText(TXT[5]);
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(error.id));
    expect(error.parentElement?.querySelector('svg')).not.toBeNull();
  });

  it('T-C-2 read-only field shows a lock icon with a tooltip', () => {
    render(
      <TextField label="Email" name="email" readOnly readOnlyReason="Managed by an administrator" value="a@example.com" />,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByTitle('Managed by an administrator')).toBeInTheDocument();
  });

  it('T-C-2 textarea shows a character counter', () => {
    render(<Textarea label="Reason" name="reason" maxLength={500} value="Hello" onChange={() => {}} />);
    expect(screen.getByLabelText('Reason')).toHaveValue('Hello');
    expect(screen.getByText('5/500')).toBeInTheDocument();
  });
});
