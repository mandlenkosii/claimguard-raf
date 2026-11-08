const TIME_ZONE = 'Africa/Johannesburg';

/** 14 Nov 2025. Timestamps are stored in UTC and shown in SAST (Section 8). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE }).format(new Date(value));
}

export function dateKey(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE }).format(new Date(value));
}

/** "a moment", "5 minutes": fills TXT-15. */
export function formatAgo(from: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - from.getTime()) / 60000);
  if (minutes < 1) return 'a moment';
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/** Shows only the start of an ID number (Section 18 #3). */
export function maskIdNumber(value: string | null): string {
  if (!value) return '—';
  return `${value.slice(0, 6)}••••••`;
}

