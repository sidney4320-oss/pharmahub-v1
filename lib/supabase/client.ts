'use client';

import { createClient } from '@supabase/supabase-js';

// Use empty strings as defaults so the module doesn't throw at import time during build
// Vercel should provide real values at runtime via environment variables.
const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey);

const supabaseUrl = configuredUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = configuredAnonKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
