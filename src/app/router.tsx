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
import { MessagesTab } from '@/pages/claims/workspace/MessagesTab';
import { LawyerDashboardPage } from '@/pages/lawyer/LawyerDashboardPage';
import { LawyerTasksPage } from '@/pages/lawyer/LawyerTasksPage';
import { ManagementDashboardPage } from '@/pages/raf/ManagementDashboardPage';
import { OfficerTasksPage } from '@/pages/raf/OfficerTasksPage';
import { RafDashboardPage } from '@/pages/raf/RafDashboardPage';
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { OrganisationsHealthPage } from '@/pages/admin/OrganisationsHealthPage';
import { RolesPage } from '@/pages/admin/RolesPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { AuditTab } from '@/pages/claims/workspace/AuditTab';
import { ReadinessTab } from '@/pages/claims/workspace/ReadinessTab';
import { RequestDetailPage } from '@/pages/claims/workspace/RequestDetailPage';
import { RequestsTab } from '@/pages/claims/workspace/RequestsTab';
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
      { path: 'messages', element: <MessagesTab /> },
      { path: 'requests', element: <RequestsTab /> },
      { path: 'requests/:requestId', element: <RequestDetailPage /> },
      { path: 'timeline', element: <TimelineTab /> },
      { path: 'audit', element: <RestrictedTab allowed="audit"><AuditTab /></RestrictedTab> },
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
      area(ROLE_ORDER, [{ path: '/claims', element: <ClaimsListPage /> }, workspace('/claims/:id'), { path: '/notifications', element: <NotificationsPage /> }, { path: '/profile', element: <ProfilePage /> }]),
      area(['lawyer'], [{ path: '/lawyer/dashboard', element: <LawyerDashboardPage /> }, { path: '/lawyer/claims', element: <ClaimsListPage /> }, { path: '/lawyer/clients', element: <ClientsPage /> }, { path: '/lawyer/clients/:id', element: <ClientDetailPage /> }, { path: '/lawyer/tasks', element: <LawyerTasksPage /> }, { path: '/lawyer/profile', element: <ProfilePage /> }]),
      area(['raf_officer'], [{ path: '/raf/dashboard', element: <RafDashboardPage /> }, { path: '/raf/claims', element: <ClaimsQueuePage /> }, workspace('/raf/claims/:id'), { path: '/raf/tasks', element: <OfficerTasksPage /> }, placeholder('/raf/reports')]),
      area(['investigator'], [{ path: '/raf/risk', element: <RiskQueuePage /> }, { path: '/raf/risk/:id', element: <InvestigationWorkspacePage /> }]),
      area(['manager'], [{ path: '/raf/management', element: <ManagementDashboardPage /> }]),
      area(['admin'], [{ path: '/admin/users', element: <UsersPage /> }, { path: '/admin/roles', element: <RolesPage /> }, { path: '/admin/organisations', element: <OrganisationsHealthPage /> }, placeholder('/admin/settings'), { path: '/admin/audit', element: <AuditLogPage /> }]),
      { path: '*', element: <AccessDeniedPage /> },
    ],
  },
];

