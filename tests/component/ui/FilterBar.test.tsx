import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@/components/ui/FilterBar';

describe('T-C-16 FilterBar', () => {
  it('T-C-16 search, select, toggle and clear filters', () => {
    const onSearch = vi.fn();
    const onStatus = vi.fn();
    const onBlocking = vi.fn();
    const onClear = vi.fn();
    render(
      <FilterBar
        search={{ label: 'Search claims', value: '', onChange: onSearch }}
        selects={[
          {
            label: 'Status',
            value: '',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'validation', label: 'Validation' },
            ],
            onChange: onStatus,
          },
        ]}
        toggles={[{ label: 'Has blocking issues', checked: false, onChange: onBlocking }]}
        onClear={onClear}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search claims' }), { target: { value: 'CG-2026' } });
    expect(onSearch).toHaveBeenCalledWith('CG-2026');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'validation' } });
    expect(onStatus).toHaveBeenCalledWith('validation');

    fireEvent.click(screen.getByRole('switch', { name: 'Has blocking issues' }));
    expect(onBlocking).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('T-C-16 renders only the parts it is given', () => {
    render(<FilterBar onClear={() => {}} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
