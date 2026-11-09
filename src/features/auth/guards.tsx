import { useUnreadCount } from '@/features/notifications/useUnreadCount';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/app/auth';
import { Skeleton } from '@/components/ui/States';
import { AppShell } from '@/layouts/AppShell';
import { landingRoute, type RoleKey } from '@/lib/access/roles';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { AccountDisabledPage } from '@/pages/auth/AccountDisabledPage';
import * as api from './api';

// UI guards only (Section 11). The browser is not the security boundary; RLS repeats every check.

function Loading() {
  return (
    <div className="mx-auto max-w-content p-6">
      <Skeleton variant="card" />
    </div>
  );
}

/** Logged-out users go to /login; inactive and unverified accounts see S08. */
export function RequireAuth() {
  const { status, session } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.accountStatus !== 'active') return <AccountDisabledPage variant="disabled" />;
  if (session.accountType === 'legal_practitioner' && !session.roles.includes('lawyer')) {
    return <AccountDisabledPage variant="pending" />;
  }
  return <Outlet />;
}

/** /login and /register: signed-in users go back to where they were heading, or their dashboard. */
export function AnonymousOnly() {
  const { session } = useAuth();
  const location = useLocation();
  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? landingRoute(session.roles) ?? '/profile'} replace />;
  }
  return <Outlet />;
}

/** Shows S08 403 when none of the user's roles may open this route. */
export function RoleRoute({ allow }: { allow: readonly RoleKey[] }) {
  const { session } = useAuth();
  if (!session?.roles.some((role) => allow.includes(role))) return <AccessDeniedPage />;
  return <Outlet />;
}

/** /dashboard is the claimant dashboard; other roles go to their own (Section 7.3, S09). */
export function DashboardRoute() {
  const { session } = useAuth();
  if (!session?.roles.includes('claimant')) return <Navigate to={landingRoute(session?.roles ?? []) ?? '/profile'} replace />;
  return <Outlet />;
}

export function ShellLayout() {
  const { session } = useAuth();
  const unreadCount = useUnreadCount(Boolean(session));
  if (!session) return null;
  const [primary] = session.roles;
  if (!primary) return <AccessDeniedPage />;
  return (
    <AppShell role={primary} roles={session.roles} userName={session.displayName} unreadCount={unreadCount} onSignOut={() => void api.signOut()}>
      <Outlet />
    </AppShell>
  );
}
