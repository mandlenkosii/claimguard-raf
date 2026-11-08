import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ErrorState } from './States';

export type SortDirection = 'ascending' | 'descending';
export type SortState = { key: string; direction: SortDirection };

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
};

type RowAction = { label: string; onSelect: () => void };

type DataTableProps<T> = {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Accessible name for a row in control labels; defaults to the first column's text. */
  getRowLabel?: (row: T) => string;
  status?: 'ready' | 'loading' | 'error';
  onRetry?: () => void;
  empty?: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowActions?: (row: T) => RowAction[];
  renderExpanded?: (row: T) => ReactNode;
  /** Buttons shown directly in each row, in a column with no heading. */
  renderActions?: (row: T) => ReactNode;
};

const cellClasses = 'px-4 py-3 text-left align-middle';

function RowActionMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="rounded-input p-1.5 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <MoreVertical aria-hidden className="size-icon-sm" />
      </button>
      {open ? (
        <div
          role="menu"
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
          className="absolute right-0 z-20 mt-1 min-w-40 rounded-card border border-border bg-surface py-1 shadow-raised"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className="block w-full px-4 py-2 text-left text-body text-text hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  getRowLabel,
  status = 'ready',
  onRetry,
  empty,
  sort,
  onSortChange,
  selectable,
  selectedIds = [],
  onSelectionChange,
  rowActions,
  renderExpanded,
  renderActions,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const rowLabel = (row: T) => getRowLabel?.(row) ?? String(columns[0]?.render(row) ?? getRowId(row));
  const allIds = rows.map(getRowId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const columnCount = columns.length + (selectable ? 1 : 0) + (renderExpanded ? 1 : 0) + (rowActions ? 1 : 0) + (renderActions ? 1 : 0);

  function toggleSort(column: DataTableColumn<T>) {
    const direction: SortDirection = sort?.key === column.key && sort.direction === 'ascending' ? 'descending' : 'ascending';
    onSortChange?.({ key: column.key, direction });
  }

  function toggleRow(id: string) {
    onSelectionChange?.(selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id]);
  }

  function body() {
    if (status === 'loading') {
      return Array.from({ length: 4 }, (_, index) => (
        <tr key={index} data-testid="skeleton-row">
          <td colSpan={columnCount} className="px-4 py-3">
            <div className="h-4 animate-pulse rounded-full bg-surface-sunken" />
          </td>
        </tr>
      ));
    }
    if (status === 'error') {
      return (
        <tr>
          <td colSpan={columnCount}>
            <ErrorState onRetry={onRetry} />
          </td>
        </tr>
      );
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount}>{empty}</td>
        </tr>
      );
    }
    return rows.map((row) => {
      const id = getRowId(row);
      const label = rowLabel(row);
      const isExpanded = expanded.includes(id);
      return (
        <Fragment key={id}>
          <tr className={cn('border-t border-border', selectedIds.includes(id) && 'bg-surface-muted')}>
            {renderExpanded ? (
              <td className={cn(cellClasses, 'w-10')}>
                <button
                  type="button"
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} row ${label}`}
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
                  }
                  className="rounded-input p-1 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronDown aria-hidden className={cn('size-icon-sm transition-transform', isExpanded && 'rotate-180')} />
                </button>
              </td>
            ) : null}
            {selectable ? (
              <td className={cn(cellClasses, 'w-10')}>
                <input
                  type="checkbox"
                  aria-label={`Select row ${label}`}
                  checked={selectedIds.includes(id)}
                  onChange={() => toggleRow(id)}
                  className="size-4 accent-accent"
                />
              </td>
            ) : null}
            {columns.map((column) => (
              <td key={column.key} className={cn(cellClasses, 'text-body text-text', column.className)}>
                {column.render(row)}
              </td>
            ))}
            {renderActions ? <td className={cn(cellClasses, 'text-right')}>{renderActions(row)}</td> : null}
            {rowActions ? (
              <td className={cn(cellClasses, 'w-12 text-right')}>
                <RowActionMenu label={label} actions={rowActions(row)} />
              </td>
            ) : null}
          </tr>
          {renderExpanded && isExpanded ? (
            <tr className="bg-surface-muted">
              <td colSpan={columnCount} className="px-4 py-4">
                {renderExpanded(row)}
              </td>
            </tr>
          ) : null}
        </Fragment>
      );
    });
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table aria-busy={status === 'loading' || undefined} className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-muted">
          <tr>
            {renderExpanded ? <td className={cellClasses} /> : null}
            {selectable ? (
              <td className={cellClasses}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={() => onSelectionChange?.(allSelected ? [] : allIds)}
                  className="size-4 accent-accent"
                />
              </td>
            ) : null}
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const SortIcon = !active ? ArrowUpDown : sort?.direction === 'ascending' ? ArrowUp : ArrowDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? (active ? sort?.direction : 'none') : undefined}
                  className={cn(cellClasses, 'text-label uppercase text-text-secondary', column.className)}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 uppercase hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {column.header}
                      <SortIcon aria-hidden className="size-icon-sm" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {renderActions ? <td className={cellClasses} /> : null}
            {rowActions ? <td className={cellClasses} /> : null}
          </tr>
        </thead>
        <tbody>{body()}</tbody>
      </table>
    </div>
  );
}

type PaginationProps = { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const buttonClasses =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-input border border-border bg-surface px-2 text-body text-text ' +
    'hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-small text-text-secondary">{`Showing ${from}–${to} of ${total}`}</p>
      <div className="flex items-center gap-1">
        <button type="button" className={buttonClasses} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden className="size-icon-sm" />
          Previous
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`Page ${number}`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
            className={cn(buttonClasses, number === page && 'border-primary bg-primary text-text-on-dark hover:bg-primary')}
          >
            {number}
          </button>
        ))}
        <button type="button" className={buttonClasses} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight aria-hidden className="size-icon-sm" />
        </button>
      </div>
    </nav>
  );
}
