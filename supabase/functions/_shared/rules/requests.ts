const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/** BR20: overdue once the due date has passed in South Africa, unless the request is closed. */
export function isOverdue(request: { due_date: string | null; status: string }, now: Date = new Date()): boolean {
  if (!request.due_date || request.status === 'closed') return false;
  const today = new Date(now.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
  return request.due_date < today;
}
