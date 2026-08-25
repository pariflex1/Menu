import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { menuItemSchema } from '@/lib/validation/menu';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const body = await request.json();
  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const updateData = { ...parsed.data, image_url: parsed.data.image_url || null };

  const { data, error } = await supabase
    .from('menu_items')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ item: data });
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
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.editMenu);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const body = await request.json();

  // Toggle availability endpoint: POST { is_available: true/false }
  if (typeof body.is_available !== 'boolean') {
    return NextResponse.json({ error: 'is_available (boolean) required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: body.is_available })
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}