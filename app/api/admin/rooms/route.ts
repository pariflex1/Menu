import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can } from '@/lib/auth/roles';
import { roomSchema } from '@/lib/validation/qr';
import { generateQrToken } from '@/lib/utils/qr';

export async function GET(request: Request) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('restaurant_id', guard.session.restaurantId)
    .order('room_number');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rooms: data });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.manageTablesRooms);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = roomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const qr_token = parsed.data.qr_token || generateQrToken('R');

  const { data, error } = await supabase
    .from('rooms')
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
        { error: 'Room number already exists for this restaurant' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room: data }, { status: 201 });
}