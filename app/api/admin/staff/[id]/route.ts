import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can, STAFF_ROLES } from '@/lib/auth/roles';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  role: z.enum(STAFF_ROLES).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.manageStaff);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const body = await request.json();
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: updated, error } = await supabase
    .from('user_profiles')
    .update(parsed.data)
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.manageStaff);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const supabase = createServiceClient();

  // Find profile first to get user_id
  const { data: profile, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('id, user_id')
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .maybeSingle();

  if (fetchErr || !profile) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  // Prevent self deletion
  if (profile.user_id === guard.session.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // Delete from user_profiles
  const { error: delErr } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Delete auth user
  try {
    await supabase.auth.admin.deleteUser(profile.user_id);
  } catch (err) {
    console.error('Failed to delete auth user:', err);
  }

  return NextResponse.json({ ok: true });
}
