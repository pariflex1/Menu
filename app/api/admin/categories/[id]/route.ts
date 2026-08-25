import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { categorySchema } from '@/lib/validation/menu';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const body = await request.json();
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('categories')
    .update(parsed.data)
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}