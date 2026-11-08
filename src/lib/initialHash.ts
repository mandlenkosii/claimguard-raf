// Captured before the Supabase client starts, because the client clears the URL hash after reading it.
export const initialHash = typeof window === 'undefined' ? '' : window.location.hash;
