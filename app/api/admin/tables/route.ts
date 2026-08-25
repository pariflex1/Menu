import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { tableSchema } from '@/lib/validation/qr';
import { generateQrToken } from '@/lib/utils/qr';

export async function GET(request: Request) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', guard.session.restaurantId)
    .order('table_number');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tables: data });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const qr_token = parsed.data.qr_token || generateQrToken('T');

  const { data, error } = await supabase
    .from('tables')
    .insert({
      ...parsed.data,
      restaurant_id: guard.session.restaurantId,
      qr_token,
    })
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

  return NextResponse.json({ table: data }, { status: 201 });
}