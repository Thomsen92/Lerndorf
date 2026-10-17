/**
 * Supabase client for the browser. Uses the anon key only (public by design).
 * The session lives in sessionStorage, so it ends when the tab is closed (SPEC §4).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function createSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storage: window.sessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
