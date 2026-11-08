import { createContext, useContext, type ReactNode } from 'react';
import type { RoleKey } from '@/lib/access/roles';

/**
 * Auth session for the UI. Phase 1 has no sign-in yet, so the session is always signed out;
 * Phase 3 fills it from Supabase Auth. The browser is not the security boundary (PRD 11.1):
 * every rule is repeated by RLS.
 */
export type AuthSession = {
  userId: string;
  displayName: string;
  roles: RoleKey[];
};

type AuthState = { session: AuthSession | null };

const AuthContext = createContext<AuthState>({ session: null });

export function AuthProvider({ session = null, children }: { session?: AuthSession | null; children: ReactNode }) {
  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
