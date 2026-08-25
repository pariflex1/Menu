import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/auth/api-guards';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const orderId = params.id;

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      order_status_history(*),
      tables(table_number),
      rooms(room_number)
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}
