import { z } from 'zod';

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  addon_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
});

export const orderCreateSchema = z.object({
  idempotency_key: z.string().uuid(),
  session_token: z.string().nullable().optional(),
  order_type: z.enum(['table', 'room', 'home']),
  items: z.array(orderItemSchema).min(1),
  customer_name: z.string().max(100).optional().default('Dine-in Guest'),
  customer_phone: z.string().max(15).optional().default('0000000000'),
  delivery_address_id: z.string().uuid().optional(),
  payment_method: z.enum(['cash', 'upi_manual', 'room_bill', 'gateway']),
  notes: z.string().max(500).nullable().optional(),
  skip_session: z.boolean().optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'new',
    'accepted',
    'preparing',
    'ready',
    'served',
    'completed',
    'cancelled',
    'out_for_delivery',
    'delivered',
  ]),
  notes: z.string().max(500).optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
