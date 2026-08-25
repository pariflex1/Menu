import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/auth/api-guards';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId || restaurantId !== guard.session.restaurantId) {
    return NextResponse.json({ error: 'invalid_restaurant' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      tables (table_number),
      rooms (room_number),
      order_items (*)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders });
}

