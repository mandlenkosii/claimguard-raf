const part = (value: unknown) => (value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value));

/** Turns a stored change into readable lines: "status: draft → validation". */
export function summaryLines(summary: Record<string, unknown>): string[] {
  return Object.entries(summary).map(([key, value]) => {
    if (value && typeof value === 'object' && 'to' in value) {
      const change = value as { from?: unknown; to?: unknown };
      return `${key}: ${part(change.from)} → ${part(change.to)}`;
    }
    return `${key}: ${part(value)}`;
  });
}
