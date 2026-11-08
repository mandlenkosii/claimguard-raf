import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '@/features/auth/api';
import type { RoleKey } from '@/lib/access/roles';

/**
 * Auth session for the UI, read from Supabase Auth and my_capabilities() (OP6).
 * The browser is not the security boundary (PRD 11.1): every rule is repeated by RLS.
 */
export type AuthSession = {
  userId: string;
  email: string;
  firstName: string;
  surname: string;
  displayName: string;
  accountType: api.MyContext['account_type'];
  accountStatus: api.MyContext['account_status'];
  practitionerStatus: api.MyContext['practitioner_status'];
  roles: RoleKey[];
  capabilities: string[];
};

type AuthState = {
  status: 'loading' | 'signed_out' | 'signed_in';
  session: AuthSession | null;
  refresh: () => Promise<void>;
};

const noRefresh = async () => {};
const AuthContext = createContext<AuthState>({ status: 'signed_out', session: null, refresh: noRefresh });

function toSession(context: api.MyContext): AuthSession {
  return {
    userId: context.user_id,
    email: context.email,
    firstName: context.first_name,
    surname: context.surname,
    displayName: `${context.first_name} ${context.surname}`,
    accountType: context.account_type,
    accountStatus: context.account_status,
    practitionerStatus: context.practitioner_status,
    roles: context.roles,
    capabilities: context.capabilities,
  };
}

function LiveAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);

  const refresh = useCallback(async () => {
    try {
      const context = await api.getMyContext();
      setSession(context ? toSession(context) : null);
      setStatus(context ? 'signed_in' : 'signed_out');
    } catch {
      setSession(null);
      setStatus('signed_out');
    }
  }, []);

  useEffect(
    () =>
      api.onAuthChange((hasSession) => {
        if (!hasSession) {
          setSession(null);
          setStatus('signed_out');
          return;
        }
        // Deferred: Supabase must finish its own auth callback before another request starts.
        window.setTimeout(() => void refresh(), 0);
      }),
    [refresh],
  );

  const value = useMemo(() => ({ status, session, refresh }), [status, session, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Pass `session` (a user or null) to fix the state, as tests do; leave it out to follow Supabase Auth. */
export function AuthProvider({ session, children }: { session?: AuthSession | null; children: ReactNode }) {
  if (session === undefined) return <LiveAuthProvider>{children}</LiveAuthProvider>;
  return (
    <AuthContext.Provider value={{ status: session ? 'signed_in' : 'signed_out', session, refresh: noRefresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
