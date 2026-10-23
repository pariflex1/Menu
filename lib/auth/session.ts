import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/auth/roles';

export interface StaffSession {
  userId: string;
  email: string | null;
  restaurantId: string;
  role: StaffRole;
  name: string;
}

/**
 * Reads the current staff session from cookies and joins `user_profiles`
 * to get restaurant + role. Returns `null` if not authenticated or not
 * mapped to a restaurant. Cached per request so multiple guards don't
 * hit the DB repeatedly.
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  // Local dev testing session only — never enabled in production
  if (process.env.NODE_ENV !== 'production') {
    try {
      const cookieStore = cookies();
      const testRole = cookieStore.get('ka_test_staff')?.value;
      if (testRole && ['owner', 'manager', 'kitchen', 'staff'].includes(testRole)) {
        return {
          userId: 'dev-admin-uuid-000000',
          email: 'admin@krishnaanandam.com',
          restaurantId: '11111111-1111-1111-1111-111111111111',
          role: testRole as StaffRole,
          name: 'Krishna Anandam Admin (Local Testing)',
        };
      }
    } catch {
      // Ignore cookie store errors outside request context
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('restaurant_id, role, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    restaurantId: profile.restaurant_id,
    role: profile.role as StaffRole,
    name: profile.name,
  };
});

/**
 * Server Component / Server Action guard. Redirects to /login if not
 * authenticated, or /login?error=forbidden if signed in but mapped to
 * no restaurant.
 */
export async function requireStaff(redirectTo = '/login'): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(redirectTo);
  return session;
}

/**
 * Server Component / Server Action guard with a role predicate. Use this
 * for routes that need e.g. owner+manager only.
 */
export async function requireRole(
  allowed: StaffRole[],
  redirectTo = '/login',
): Promise<StaffSession> {
  const session = await requireStaff(redirectTo);
  if (!allowed.includes(session.role)) {
    redirect(`${redirectTo}?error=forbidden`);
  }
  return session;
}