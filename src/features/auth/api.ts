import { supabase } from '@/lib/supabase';
import type { RoleKey } from '@/lib/access/roles';

export type FailureReason = 'invalid' | 'rate_limited' | 'error';
export type Result = { ok: true } | { ok: false; reason: FailureReason };

export type MyContext = {
  user_id: string;
  email: string;
  first_name: string;
  surname: string;
  account_type: 'claimant' | 'legal_practitioner' | 'staff';
  account_status: 'active' | 'invited' | 'suspended' | 'disabled';
  practitioner_status: 'pending' | 'verified' | 'rejected' | null;
  roles: RoleKey[];
  capabilities: string[];
};

export type MyProfile = {
  first_name: string;
  surname: string;
  email: string;
  mobile: string | null;
  preferred_language: string | null;
  preferred_contact_method: 'email' | 'phone' | null;
};

export type ProfileUpdate = Pick<MyProfile, 'first_name' | 'surname' | 'mobile' | 'preferred_language' | 'preferred_contact_method'>;

export type SignUpInput = {
  accountType: 'claimant' | 'legal_practitioner';
  firstName: string;
  surname: string;
  email: string;
  mobile: string;
  password: string;
  firmName?: string;
  practiceNumber?: string;
};

const failure = (status?: number): Result => ({ ok: false, reason: status === 429 ? 'rate_limited' : 'error' });

/** OP2. A wrong password and an unknown email give the same result. */
export async function signIn(email: string, password: string): Promise<Result> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true };
  if (error.status === 429) return { ok: false, reason: 'rate_limited' };
  return { ok: false, reason: error.status === 400 ? 'invalid' : 'error' };
}

/** OP1. Sign-up metadata can only choose claimant or legal practitioner (BR23). */
export async function signUp(input: SignUpInput): Promise<({ ok: true; hasSession: boolean }) | { ok: false; reason: FailureReason }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        account_type: input.accountType,
        first_name: input.firstName,
        surname: input.surname,
        mobile: input.mobile || null,
        popia_consent: true,
        firm_name: input.firmName,
        practice_number: input.practiceNumber,
      },
    },
  });
  if (error) return { ok: false, reason: error.status === 429 ? 'rate_limited' : 'error' };
  return { ok: true, hasSession: Boolean(data.session) };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** OP4. */
export async function requestPasswordReset(email: string): Promise<Result> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  return error ? failure(error.status) : { ok: true };
}

/** OP5, and the change-password block on S13. */
export async function updatePassword(password: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? failure(error.status) : { ok: true };
}

export async function signOutOtherSessions(): Promise<Result> {
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  return error ? failure(error.status) : { ok: true };
}

/** OP8. The server signs in the demo account; the browser only receives the session. */
export async function demoSignIn(role: RoleKey): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('demo-sign-in', { body: { role } });
  if (error || !data?.access_token) return { ok: false, reason: 'error' };
  const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  return sessionError ? failure() : { ok: true };
}

/** OP6. */
export async function getMyContext(): Promise<MyContext | null> {
  const { data, error } = await supabase.rpc('my_capabilities');
  if (error) throw error;
  return (data as MyContext | null) ?? null;
}

export function onAuthChange(listener: (hasSession: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(Boolean(session)));
  return () => data.subscription.unsubscribe();
}

export async function getMyProfile(userId: string): Promise<MyProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, surname, email, mobile, preferred_language, preferred_contact_method')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as MyProfile;
}

/** OP7. */
export async function updateMyProfile(userId: string, update: ProfileUpdate): Promise<Result> {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  return error ? failure() : { ok: true };
}
