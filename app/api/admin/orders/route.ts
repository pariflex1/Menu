import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/auth/api-guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard.response;

  const restaurantId = guard.session.restaurantId;

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

