import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { TXT } from '@/lib/format/messages';

type Row = { id: string; reference: string; claimant: string };

const rows: Row[] = [
  { id: '1', reference: 'CG-2026-000142', claimant: 'Sipho Ndlovu' },
  { id: '2', reference: 'CG-2026-000143', claimant: 'Thandiwe Mokoena' },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'reference', header: 'Claim reference', sortable: true, render: (row) => row.reference },
  { key: 'claimant', header: 'Claimant', render: (row) => row.claimant },
];

describe('T-C-15 DataTable and Pagination', () => {
  it('T-C-15 renders headers and rows', () => {
    render(<DataTable caption="Claims" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const table = screen.getByRole('table', { name: 'Claims' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Claim reference', 'Claimant']);
    expect(within(table).getByText('CG-2026-000142')).toBeInTheDocument();
    expect(within(table).getByText('Thandiwe Mokoena')).toBeInTheDocument();
  });

  it('T-C-15 sortable columns report the next sort and show aria-sort', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        caption="Claims"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        sort={{ key: 'reference', direction: 'ascending' }}
        onSortChange={onSortChange}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Claim reference/ });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(within(header).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'reference', direction: 'descending' });
  });

  it('T-C-15 bulk selection selects every row', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        caption="Claims"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['1', '2']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row CG-2026-000143' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['2']);
  });

  it('T-C-15 the row action menu runs an action', () => {
    const onOpen = vi.fn();
    render(
      <DataTable
        caption="Claims"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowActions={(row) => [{ label: 'Open', onSelect: () => onOpen(row.id) }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Actions for CG-2026-000142' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledWith('1');
  });

  it('T-C-15 rows can expand', () => {
    render(
      <DataTable
        caption="Claims"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        renderExpanded={(row) => <p>Details for {row.reference}</p>}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Expand row CG-2026-000142' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Details for CG-2026-000142')).toBeInTheDocument();
  });

  it('T-C-15 empty state', () => {
    render(
      <DataTable caption="Claims" columns={columns} rows={[]} getRowId={(r) => r.id} empty={<p>{TXT[48]}</p>} />,
    );
    expect(screen.getByText(TXT[48])).toBeInTheDocument();
  });

  it('T-C-15 loading skeleton', () => {
    render(<DataTable caption="Claims" columns={columns} rows={[]} getRowId={(r) => r.id} status="loading" />);
    expect(screen.getByRole('table', { name: 'Claims' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0);
  });

  it('T-C-15 error state with Try again', () => {
    const onRetry = vi.fn();
    render(
      <DataTable caption="Claims" columns={columns} rows={[]} getRowId={(r) => r.id} status="error" onRetry={onRetry} />,
    );
    expect(screen.getByText(TXT[3])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('T-C-15 pagination moves between pages', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<Pagination page={1} pageSize={10} total={38} onPageChange={onPageChange} />);
    expect(screen.getByText('Showing 1–10 of 38')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    rerender(<Pagination page={4} pageSize={10} total={38} onPageChange={onPageChange} />);
    expect(screen.getByText('Showing 31–38 of 38')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveAttribute('aria-current', 'page');
  });
});
