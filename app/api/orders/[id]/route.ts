import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(
      { error: 'order_not_found' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  // Normalize numeric fields for consumer safety
  const normalizedOrder = {
    ...order,
    total: Number(order.total ?? order.total_amount ?? 0),
    tax: Number(order.tax ?? order.tax_amount ?? 0),
    subtotal: Number(order.subtotal ?? 0),
    delivery_fee: Number(order.delivery_fee ?? 0),
    order_items: (order.order_items || []).map((item: any) => ({
      ...item,
      unit_price: Number(item.unit_price || 0),
      total_price: Number(item.total_price || item.subtotal || 0),
    })),
  };

  return NextResponse.json(
    { order: normalizedOrder },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
