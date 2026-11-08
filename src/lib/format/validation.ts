import { TXT } from './messages';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** TXT-4 when empty, TXT-5 when malformed, otherwise no error. */
export function emailError(value: string): string | undefined {
  if (!value.trim()) return TXT[4];
  return EMAIL.test(value.trim()) ? undefined : TXT[5];
}

export function requiredError(value: string): string | undefined {
  return value.trim() ? undefined : TXT[4];
}

/** TXT-7: at least 8 characters, including a letter and a number (Section 18 #3). */
export function passwordError(value: string): string | undefined {
  if (!value) return TXT[4];
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) ? undefined : TXT[7];
}

export function confirmError(password: string, confirm: string): string | undefined {
  if (!confirm) return TXT[4];
  return password === confirm ? undefined : TXT[6];
}
