/**
 * Role keys and UI-only navigation (Section 11). These helpers mirror, and never replace,
 * the server rules in Section 9: hiding a link is not a permission check.
 */

export const ROLE_ORDER = ['claimant', 'lawyer', 'raf_officer', 'investigator', 'manager', 'admin'] as const;

export type RoleKey = (typeof ROLE_ORDER)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  claimant: 'Claimant',
  lawyer: 'Lawyer',
  raf_officer: 'RAF officer',
  investigator: 'Investigator',
  manager: 'Manager',
  admin: 'Administrator',
};

/** Role landing pages (Section 11, Section 18 #19). */
export const LANDING_ROUTES: Record<RoleKey, string> = {
  claimant: '/dashboard',
  lawyer: '/lawyer/dashboard',
  raf_officer: '/raf/dashboard',
  investigator: '/raf/risk',
  manager: '/raf/management',
  admin: '/admin/users',
};

/** Users with several roles land on the first role in ROLE_ORDER (Section 18 #23). */
export function landingRoute(roles: readonly RoleKey[]): string | null {
  const first = ROLE_ORDER.find((role) => roles.includes(role));
  return first ? LANDING_ROUTES[first] : null;
}
