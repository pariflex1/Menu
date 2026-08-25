import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env';

/**
 * Server client bound to the request cookies. Use this for any RLS-respecting
 * read/write inside Route Handlers, Server Components, or Server Actions.
 *
 * For privileged operations that must bypass RLS (price recompute, order
 * creation cross-checks), use `createServiceClient` instead — never expose
 * the service client to the browser.
 */
export async function createClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; the Route Handler path
          // handles refresh writes. Swallow here so reads still succeed.
        }
      },
    },
  });
}