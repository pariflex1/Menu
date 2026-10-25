import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireRoleApi(['owner', 'manager']);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();
  const restaurantId = guard.session.restaurantId;

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
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const addressIds = Array.from(
    new Set(
      (orders || [])
        .map((o) => o.delivery_address_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const addressesById: Record<string, any> = {};
  if (addressIds.length > 0) {
    const { data: addresses } = await supabase
      .from('customer_addresses')
      .select('id, address_line1, address_line2, city, state, pincode')
      .in('id', addressIds);

    for (const address of addresses || []) {
      addressesById[address.id] = address;
    }
  }

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1000);

  return NextResponse.json({
    orders: (orders || []).map((order) => ({
      ...order,
      customer_addresses: order.delivery_address_id
        ? addressesById[order.delivery_address_id] || null
        : null,
    })),
    logs: logs || [],
  });
}
