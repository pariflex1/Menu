import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/auth/api-guards';
import { orderStatusUpdateSchema } from '@/lib/validation/orders';

export const dynamic = 'force-dynamic';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'preparing', 'ready', 'served', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'rejected'],
  accepted: ['preparing', 'ready', 'served', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
  preparing: ['ready', 'served', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
  ready: ['served', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
  served: ['completed', 'cancelled'],
  out_for_delivery: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: ['completed', 'cancelled', 'served'],
  cancelled: ['new', 'accepted'],
  rejected: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireStaffApi();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = orderStatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { status: newStatus, notes } = parsed.data;
  const orderId = params.id;
  const supabase = createServiceClient();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, restaurant_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  if (order.restaurant_id !== guard.session.restaurantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const currentStatus = order.status;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [
    'accepted',
    'preparing',
    'ready',
    'served',
    'out_for_delivery',
    'delivered',
    'completed',
    'cancelled',
  ];

  if (!allowedTransitions.includes(newStatus)) {
    return NextResponse.json(
      { error: 'invalid_transition', from: currentStatus, to: newStatus },
      { status: 409 },
    );
  }

  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: newStatus,
    changed_by: guard.session.userId,
    notes: notes || null,
  });

  if (historyError) {
    console.error('Failed to create status history:', historyError);
  }

  return NextResponse.json(
    { ok: true, status: newStatus },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
