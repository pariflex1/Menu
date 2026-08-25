import { NextResponse } from 'next/server';
import { getStaffSession, type StaffSession } from '@/lib/auth/session';
import { can, type StaffRole } from '@/lib/auth/roles';

/**
 * Route Handler guard. Returns either a session or a JSON 401/403 response.
 * Use:
 *   const guard = await requireStaffApi();
 *   if (!guard.ok) return guard.response;
 *   const { session } = guard;
 */
export type ApiGuardResult =
  | { ok: true; session: StaffSession }
  | { ok: false; response: NextResponse };

export async function requireStaffApi(): Promise<ApiGuardResult> {
  const session = await getStaffSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export async function requireRoleApi(
  roles: StaffRole[],
  permission?: (role: StaffRole) => boolean,
): Promise<ApiGuardResult> {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard;

  const roleAllowed = roles.length === 0 || roles.includes(guard.session.role);
  const permAllowed = permission ? permission(guard.session.role) : true;

  if (!roleAllowed || !permAllowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'forbidden', role: guard.session.role },
        { status: 403 },
      ),
    };
  }
  return guard;
}

/** Convenience wrapper: check `can.X(session.role)`. */
export async function requirePermissionApi(
  permission: keyof typeof can,
): Promise<ApiGuardResult> {
  return requireRoleApi([], can[permission]);
}