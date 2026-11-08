import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { HowItWorksPage } from '@/pages/public/HowItWorksPage';
import { LandingPage } from '@/pages/public/LandingPage';
import { SecurityPage } from '@/pages/public/SecurityPage';
import { useAuth } from './auth';

function PublicRoutes() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

/**
 * Route guard (Section 11): logged-out users are sent to /login and return to the requested route
 * after sign-in. The browser is not the security boundary; RLS repeats every check.
 */
function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export const routes: RouteObject[] = [
  {
    element: <PublicRoutes />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/security', element: <SecurityPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    // Every other route is protected. Signed-in screens are added phase by phase.
    element: <RequireAuth />,
    children: [{ path: '*', element: null }],
  },
];
