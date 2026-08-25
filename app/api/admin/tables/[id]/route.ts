import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { tableSchema } from '@/lib/validation/qr';
import { generateQrToken } from '@/lib/utils/qr';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const body = await request.json();
  const parsed = tableSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // If QR token is being changed, generate a new one
  const updateData = { ...parsed.data };
  if (parsed.data.qr_token === 'regenerate') {
    updateData.qr_token = generateQrToken('T');
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tables')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Table number already exists for this restaurant' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ table: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const id = params.id;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', guard.session.restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}