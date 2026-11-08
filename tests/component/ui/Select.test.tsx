import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect, Select } from '@/components/ui/Select';

const provinces = [
  { value: 'GP', label: 'Gauteng' },
  { value: 'LP', label: 'Limpopo' },
  { value: 'WC', label: 'Western Cape' },
];

describe('T-C-3 Select and MultiSelect', () => {
  it('T-C-3 default select lists options and reports changes', () => {
    const onChange = vi.fn();
    render(<Select label="Accident province" name="province" options={provinces} value="" onChange={onChange} />);
    const select = screen.getByLabelText('Accident province');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Gauteng', 'Limpopo', 'Western Cape']),
    );
    fireEvent.change(select, { target: { value: 'LP' } });
    expect(onChange).toHaveBeenCalledWith('LP');
  });

  it('T-C-3 required select shows an asterisk', () => {
    render(<Select label="Province" name="p" required options={provinces} value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/Province/)).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('T-C-3 error state marks the select invalid', () => {
    render(<Select label="Province" name="p" error="This field is required." options={provinces} value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Province')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
  });

  it('T-C-3 disabled select cannot be changed', () => {
    render(<Select label="Province" name="p" disabled options={provinces} value="GP" onChange={() => {}} />);
    expect(screen.getByLabelText('Province')).toBeDisabled();
  });

  it('T-C-3 multi-select reports every selected value', () => {
    const onChange = vi.fn();
    render(<MultiSelect label="Provinces" name="ps" options={provinces} value={[]} onChange={onChange} />);
    const select = screen.getByLabelText('Provinces') as HTMLSelectElement;
    expect(select.multiple).toBe(true);
    const [gp, , wc] = Array.from(select.options);
    gp!.selected = true;
    wc!.selected = true;
    fireEvent.change(select);
    expect(onChange).toHaveBeenCalledWith(['GP', 'WC']);
  });
});
