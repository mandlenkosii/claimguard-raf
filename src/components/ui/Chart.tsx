import { DEMONSTRATION_DATA_LABEL, TXT } from '@/lib/format/messages';

type BarChartProps = { title: string; data: Array<{ label: string; value: number }>; demo?: boolean };

/** One series of magnitudes. Each bar names its value, and a table repeats them for screen readers. */
export function BarChart({ title, data, demo }: BarChartProps) {
  const shown = data.filter((item) => item.value > 0);
  const top = Math.max(0, ...shown.map((item) => item.value));
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-h3 text-primary">{title}</h2>
      {shown.length ? (
        <>
          <ul aria-hidden className="mt-4 space-y-3">
            {shown.map((item) => {
              const percent = Math.round((item.value / top) * 100);
              return (
                <li key={item.label} title={`${item.label}: ${item.value}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-3 text-small text-text">
                  <span className="truncate">{item.label}</span>
                  <span className="block h-2">
                    <span data-testid={`bar-${item.label}`} data-percent={percent} className="block h-full min-w-1 rounded-r-chip bg-accent" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="font-semibold">{item.value}</span>
                </li>
              );
            })}
          </ul>
          <table aria-label={title} className="sr-only">
            <tbody>
              {shown.map((item) => (
                <tr key={item.label}>
                  <th scope="row">{item.label}</th>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="mt-3 text-body text-text-secondary">{TXT[59]}</p>
      )}
      {demo ? <p className="mt-3 inline-flex rounded-chip bg-surface-muted px-2 py-0.5 text-small text-text-secondary">{DEMONSTRATION_DATA_LABEL}</p> : null}
    </section>
  );
}
