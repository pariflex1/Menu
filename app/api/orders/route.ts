import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { orderCreateSchema } from '@/lib/validation/orders';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = orderCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    idempotency_key,
    session_token,
    order_type,
    items,
    customer_name,
    customer_phone,
    delivery_address_id,
    payment_method,
    notes,
    skip_session,
  } = parsed.data;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotency_key)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ order: existing }, { status: 200 });
  }

  let restaurantId: string;
  let tableId: string | null = null;
  let roomId: string | null = null;
  let qrSessionId: string | null = null;
  let customerId: string | null = null;

  if (skip_session && (order_type === 'table' || order_type === 'room')) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
    }

    restaurantId = restaurant.id;

    if (order_type === 'table') {
      const { data: defaultTable } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .limit(1)
        .maybeSingle();
      tableId = defaultTable?.id || null;
    } else if (order_type === 'room') {
      const { data: defaultRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .limit(1)
        .maybeSingle();
      roomId = defaultRoom?.id || null;
    }
  } else if (order_type === 'table' || order_type === 'room') {
    if (!session_token) {
      return NextResponse.json({ error: 'session_token required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('qr_sessions')
      .select('*')
      .eq('session_token', session_token)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt && !session.is_verified) {
      return NextResponse.json({ error: 'session_expired' }, { status: 410 });
    }

    restaurantId = session.restaurant_id;
    qrSessionId = session.id;

    if (order_type === 'table') {
      tableId = session.source_id;
    } else {
      roomId = session.source_id;
    }

    customerId = session.customer_id;
  } else {
    if (!delivery_address_id) {
      return NextResponse.json({ error: 'delivery_address_id required' }, { status: 400 });
    }

    const { data: address } = await supabase
      .from('customer_addresses')
      .select('customer_id, customers!inner(restaurant_id)')
      .eq('id', delivery_address_id)
      .maybeSingle();

    if (!address) {
      return NextResponse.json({ error: 'invalid_address' }, { status: 404 });
    }

    customerId = address.customer_id;
    restaurantId = (address.customers as any).restaurant_id;
  }

  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single();

  if (!settings) {
    return NextResponse.json({ error: 'restaurant_not_configured' }, { status: 500 });
  }

  const now = new Date();
  const currentTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  if (settings.manual_override === 'closed') {
    return NextResponse.json({ error: 'restaurant_closed' }, { status: 422 });
  }

  if (
    !settings.manual_override &&
    (currentTime < settings.opening_time.slice(0, 5) || currentTime > settings.closing_time.slice(0, 5))
  ) {
    return NextResponse.json({ error: 'restaurant_closed' }, { status: 422 });
  }

  if (order_type === 'table' && !settings.table_ordering_enabled) {
    return NextResponse.json({ error: 'table_ordering_disabled' }, { status: 422 });
  }

  if (order_type === 'room' && !settings.room_service_enabled) {
    return NextResponse.json({ error: 'room_service_disabled' }, { status: 422 });
  }

  if (order_type === 'home' && !settings.home_delivery_enabled) {
    return NextResponse.json({ error: 'home_delivery_disabled' }, { status: 422 });
  }

  const menuItemIds = items.map((item) => item.menu_item_id);
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available, restaurant_id')
    .in('id', menuItemIds);

  if (menuError || !menuItems) {
    return NextResponse.json({ error: 'failed_to_fetch_menu' }, { status: 500 });
  }

  for (const item of items) {
    const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
    if (!menuItem) {
      return NextResponse.json(
        { error: 'item_not_found', item_id: item.menu_item_id },
        { status: 422 },
      );
    }
    if (menuItem.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'item_wrong_restaurant' }, { status: 422 });
    }
    if (!menuItem.is_available) {
      return NextResponse.json(
        { error: 'item_unavailable', item_id: item.menu_item_id },
        { status: 422 },
      );
    }
  }

  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = menuItems.find((m) => m.id === item.menu_item_id)!;
    let unitPrice = parseFloat(menuItem.price.toString());

    if (item.addon_ids && item.addon_ids.length > 0) {
      const { data: addons } = await supabase
        .from('menu_item_addons')
        .select('id, price, is_available')
        .in('id', item.addon_ids);

      if (addons) {
        for (const addon of addons) {
          if (!addon.is_available) {
            return NextResponse.json(
              { error: 'addon_unavailable', addon_id: addon.id },
              { status: 422 },
            );
          }
          unitPrice += parseFloat(addon.price.toString());
        }
      }
    }

    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      menu_item_id: item.menu_item_id,
      item_name: menuItem.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes: item.notes || null,
    });
  }

  const tax = (subtotal * parseFloat(settings.tax_percent.toString())) / 100;
  const deliveryFee = order_type === 'home' ? parseFloat(settings.delivery_fee.toString()) : 0;
  const total = subtotal + tax + deliveryFee;

  if (order_type === 'home' && subtotal < parseFloat(settings.min_home_order_amount.toString())) {
    return NextResponse.json(
      {
        error: 'below_minimum_order',
        min_amount: settings.min_home_order_amount,
        current_amount: subtotal,
      },
      { status: 422 },
    );
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      customer_id: customerId,
      order_type,
      table_id: tableId,
      room_id: roomId,
      qr_session_id: qrSessionId,
      customer_name,
      customer_phone,
      delivery_address_id: order_type === 'home' ? delivery_address_id : null,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      payment_method,
      payment_status: payment_method === 'cash' || payment_method === 'room_bill' ? payment_method : 'pending',
      status: 'new',
      idempotency_key,
      notes: notes || null,
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const itemsToInsert = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { error: historyError } = await supabase.from('order_status_history').insert({
    order_id: order.id,
    status: 'new',
    changed_by: null,
    notes: 'Order created',
  });

  if (historyError) {
    console.error('Failed to create status history:', historyError);
  }

  return NextResponse.json(
    {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
      },
    },
    { status: 201 },
  );
}
