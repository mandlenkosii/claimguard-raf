import type { AuthSession } from '@/app/auth';

// UI-only checks that mirror, and never replace, the server rules in Section 9.

/** SEC14: investigators see evidence; officers and lawyers see the limited flag. */
export function canSeeRiskTab(session: AuthSession): boolean {
  return session.roles.some((role) => role === 'investigator' || role === 'raf_officer' || role === 'lawyer');
}

/** SEC24: administrators, and officers with audit.view. */
export function canSeeAuditTab(session: AuthSession): boolean {
  return session.roles.includes('admin') || (session.roles.includes('raf_officer') && session.capabilities.includes('audit.view'));
}

export function canChangeStatus(session: AuthSession): boolean {
  return session.roles.some((role) => role === 'claimant' || role === 'lawyer' || role === 'raf_officer');
}

export function canCreateClaim(session: AuthSession): boolean {
  return session.roles.some((role) => role === 'claimant' || role === 'lawyer');
}
