import { Outlet, type RouteObject } from 'react-router';
import { AnonymousOnly, DashboardRoute, RequireAuth, RoleRoute, ShellLayout } from '@/features/auth/guards';
import { PublicLayout } from '@/layouts/PublicLayout';
import { ROLE_ORDER, type RoleKey } from '@/lib/access/roles';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { PasswordRecoveryPage } from '@/pages/auth/PasswordRecoveryPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ClaimWorkspaceLayout, RestrictedTab } from '@/pages/claims/workspace/ClaimWorkspaceLayout';
import { DocumentsTab } from '@/pages/claims/workspace/DocumentsTab';
import { ReadinessTab } from '@/pages/claims/workspace/ReadinessTab';
import { RiskTab } from '@/pages/claims/workspace/RiskTab';
import { InvestigationWorkspacePage } from '@/pages/risk/InvestigationWorkspacePage';
import { RiskQueuePage } from '@/pages/risk/RiskQueuePage';
import { OverviewTab } from '@/pages/claims/workspace/OverviewTab';
import { TimelineTab } from '@/pages/claims/workspace/TimelineTab';
import { ClientDetailPage } from '@/pages/lawyer/ClientDetailPage';
import { ClientsPage } from '@/pages/lawyer/ClientsPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { HowItWorksPage } from '@/pages/public/HowItWorksPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { SecurityPage } from '@/pages/public/SecurityPage';
import { ClaimsQueuePage } from '@/pages/raf/ClaimsQueuePage';
import { ClaimantDashboardPage } from '@/pages/shared/ClaimantDashboardPage';
import { ClaimsListPage } from '@/pages/shared/ClaimsListPage';
import { NewClaimPage } from '@/pages/shared/NewClaimPage';
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

// Documents, Readiness, Messages and Requests are filled in by Phases 5, 6 and 8.
function workspace(path: string): RouteObject {
  return {
    path,
    element: <ClaimWorkspaceLayout />,
    children: [
      { index: true, element: <OverviewTab /> },
      { path: 'documents', element: <DocumentsTab /> },
      { path: 'readiness', element: <ReadinessTab /> },
      { path: 'risk', element: <RestrictedTab allowed="risk"><RiskTab /></RestrictedTab> },
      { path: 'messages', element: null },
      { path: 'requests', element: null },
      { path: 'timeline', element: <TimelineTab /> },
      { path: 'audit', element: <RestrictedTab allowed="audit" /> },
    ],
  };
}

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
        children: [area(['claimant'], [{ path: '/dashboard', element: <ClaimantDashboardPage /> }])],
      },
      area(['claimant', 'lawyer', 'raf_officer'], [{ path: '/claims/new', element: <NewClaimPage /> }]),
      area(ROLE_ORDER, [{ path: '/claims', element: <ClaimsListPage /> }, workspace('/claims/:id'), placeholder('/notifications'), { path: '/profile', element: <ProfilePage /> }]),
      area(['lawyer'], [placeholder('/lawyer/dashboard'), { path: '/lawyer/claims', element: <ClaimsListPage /> }, { path: '/lawyer/clients', element: <ClientsPage /> }, { path: '/lawyer/clients/:id', element: <ClientDetailPage /> }, placeholder('/lawyer/tasks'), { path: '/lawyer/profile', element: <ProfilePage /> }]),
      area(['raf_officer'], [placeholder('/raf/dashboard'), { path: '/raf/claims', element: <ClaimsQueuePage /> }, workspace('/raf/claims/:id'), placeholder('/raf/tasks'), placeholder('/raf/reports')]),
      area(['investigator'], [{ path: '/raf/risk', element: <RiskQueuePage /> }, { path: '/raf/risk/:id', element: <InvestigationWorkspacePage /> }]),
      area(['manager'], [placeholder('/raf/management')]),
      area(['admin'], [placeholder('/admin/users'), placeholder('/admin/roles'), placeholder('/admin/organisations'), placeholder('/admin/settings'), placeholder('/admin/audit')]),
      { path: '*', element: <AccessDeniedPage /> },
    ],
  },
];

