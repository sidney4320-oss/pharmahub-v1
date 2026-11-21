'use client';

import { createClient } from '@supabase/supabase-js';

// Use empty strings as defaults so the module doesn't throw at import time during build
// Vercel should provide real values at runtime via environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const buildSupabaseUrl = 'http://127.0.0.1:54321';
const buildSupabaseAnonKey = 'pharmahub-build-placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are not set. Supabase client created with empty credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl || buildSupabaseUrl, supabaseAnonKey || buildSupabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
