import { createClient } from '@supabase/supabase-js';

// The public anon client only. Every request is still limited by RLS (Section 6).
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

