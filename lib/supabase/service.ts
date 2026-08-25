import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

/**
 * Service-role client. Bypasses RLS. Server-only — never import from a Client
 * Component or expose to the browser bundle. Use sparingly: price recalc,
 * idempotency lookup, atomic order-number generation.
 */
export function createServiceClient() {
  const env = getServerEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}