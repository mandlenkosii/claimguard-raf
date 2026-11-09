import { cn } from '@/lib/cn';

export type ComparisonRow = { field: string; sourceA: string; sourceB: string; sourceALabel?: string; sourceBLabel?: string; match: boolean };

function Value({ value, label }: { value: string; label?: string }) {
  return (
    <>
      <span className="block font-mono text-mono text-primary">{value}</span>
      {label ? <span className="block text-small text-text-secondary">{label}</span> : null}
    </>
  );
}

const headerClasses = 'px-3 py-2 text-left text-label uppercase text-text-secondary';

/** Side-by-side sources (S18). The result is always written out, not only coloured. */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-input border border-border">
      <table className="w-full border-collapse">
        <thead className="bg-surface-muted">
          <tr>
            {['Field', 'Source A', 'Source B', 'Match'].map((header) => (
              <th key={header} scope="col" className={headerClasses}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.field}-${index}`} className="border-t border-border align-top">
              <td className="px-3 py-2 text-body text-text">{row.field}</td>
              <td className="px-3 py-2">
                <Value value={row.sourceA} label={row.sourceALabel} />
              </td>
              <td className={cn('px-3 py-2', !row.match && 'bg-warning-tint')}>
                <Value value={row.sourceB} label={row.sourceBLabel} />
              </td>
              <td className="px-3 py-2">
                <span className={cn('text-small font-semibold', row.match ? 'text-success' : 'text-error')}>{row.match ? 'Match' : 'Mismatch'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
