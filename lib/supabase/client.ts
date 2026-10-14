'use client';

import { createClient } from '@supabase/supabase-js';

// Use empty strings as defaults so the module doesn't throw at import time during build
// Vercel should provide real values at runtime via environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing so builds succeed even if env vars are not set yet.
  // Runtime calls will still fail until valid keys are provided in Vercel.
  // This makes debugging easier: build won't fail with a thrown error.
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are not set. Supabase client created with empty credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
