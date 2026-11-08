import { Outlet, type RouteObject } from 'react-router';
import { AnonymousOnly, DashboardRoute, RequireAuth, RoleRoute, ShellLayout } from '@/features/auth/guards';
import { PublicLayout } from '@/layouts/PublicLayout';
import { ROLE_ORDER, type RoleKey } from '@/lib/access/roles';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { PasswordRecoveryPage } from '@/pages/auth/PasswordRecoveryPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { HowItWorksPage } from '@/pages/public/HowItWorksPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { SecurityPage } from '@/pages/public/SecurityPage';
import { ProfilePage } from '@/pages/shared/ProfilePage';

function PublicRoutes() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

/** Routes one set of roles may open, inside the app shell. Screens without a page yet render empty until their phase. */
function area(allow: readonly RoleKey[], children: RouteObject[]): RouteObject {
  return { element: <RoleRoute allow={allow} />, children: [{ element: <ShellLayout />, children }] };
}

const placeholder = (path: string): RouteObject => ({ path, element: null });

export const routes: RouteObject[] = [
  {
    element: <PublicRoutes />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/security', element: <SecurityPage /> },
    ],
  },
  {
    element: <AnonymousOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  // Open to logged-out users and to holders of a reset link, who already have a recovery session.
  { path: '/reset-password', element: <PasswordRecoveryPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardRoute />,
        children: [area(['claimant'], [placeholder('/dashboard')])],
      },
      area(ROLE_ORDER, [placeholder('/claims'), placeholder('/notifications'), { path: '/profile', element: <ProfilePage /> }]),
      area(['lawyer'], [placeholder('/lawyer/dashboard'), placeholder('/lawyer/claims'), placeholder('/lawyer/clients'), placeholder('/lawyer/tasks'), { path: '/lawyer/profile', element: <ProfilePage /> }]),
      area(['raf_officer'], [placeholder('/raf/dashboard'), placeholder('/raf/claims'), placeholder('/raf/tasks'), placeholder('/raf/reports')]),
      area(['investigator'], [placeholder('/raf/risk')]),
      area(['manager'], [placeholder('/raf/management')]),
      area(['admin'], [placeholder('/admin/users'), placeholder('/admin/roles'), placeholder('/admin/organisations'), placeholder('/admin/settings'), placeholder('/admin/audit')]),
      { path: '*', element: <AccessDeniedPage /> },
    ],
  },
];
