import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const sessionRequestSchema = z.object({
  qr_token: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = sessionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { qr_token } = parsed.data;
  const supabase = createServiceClient();

  let sourceType: 'table' | 'room' | null = null;
  let sourceId: string | null = null;
  let sourceName: string | null = null;
  let restaurantId: string | null = null;

  const { data: table } = await supabase
    .from('tables')
    .select('id, table_number, restaurant_id, status')
    .eq('qr_token', qr_token)
    .maybeSingle();

  if (table && table.status === 'active') {
    sourceType = 'table';
    sourceId = table.id;
    sourceName = `Table ${table.table_number}`;
    restaurantId = table.restaurant_id;
  }

  if (!sourceType) {
    const { data: room } = await supabase
      .from('rooms')
      .select('id, room_number, restaurant_id, status')
      .eq('qr_token', qr_token)
      .maybeSingle();

    if (room && (room.status === 'available' || room.status === 'occupied')) {
      sourceType = 'room';
      sourceId = room.id;
      sourceName = `Room ${room.room_number}`;
      restaurantId = room.restaurant_id;
    }
  }

  if (!sourceType || !sourceId || !restaurantId) {
    return NextResponse.json({ error: 'invalid_qr_token' }, { status: 404 });
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'invalid_qr_token' }, { status: 404 });
  }

  const sessionToken = nanoid(32);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 5 * 60 * 1000);

  const { data: session, error } = await supabase
    .from('qr_sessions')
    .insert({
      restaurant_id: restaurantId,
      qr_token,
      source_type: sourceType,
      source_id: sourceId,
      session_token: sessionToken,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session_token: session.session_token,
    source_type: sourceType,
    source_name: sourceName,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
    },
    started_at: session.started_at,
    expires_at: session.expires_at,
  });
}
