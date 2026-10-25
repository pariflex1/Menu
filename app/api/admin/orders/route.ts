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

  const enrichedOrders = (orders || []).map((order) => ({
    ...order,
    customer_addresses: order.delivery_address_id
      ? addressesById[order.delivery_address_id] || null
      : null,
  }));

  return NextResponse.json({ orders: enrichedOrders });
}

