import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStaffApi } from '@/lib/auth/api-guards';
import { orderStatusUpdateSchema } from '@/lib/validation/orders';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'out_for_delivery', 'cancelled'],
  served: ['completed'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
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
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return NextResponse.json(
      { error: 'invalid_transition', from: currentStatus, to: newStatus },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
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

  return NextResponse.json({ ok: true, status: newStatus });
}
