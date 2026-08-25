import { z } from 'zod';

export const tableSchema = z.object({
  id: z.string().uuid().optional(),
  table_number: z.string().min(1).max(20),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  qr_token: z.string().optional(),
});

export const roomSchema = z.object({
  id: z.string().uuid().optional(),
  room_number: z.string().min(1).max(20),
  floor: z.string().max(10).optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'inactive']).default('available'),
  qr_token: z.string().optional(),
});

export const qrSessionRequestSchema = z.object({
  qr_token: z.string().min(1),
});

export type TableInput = z.infer<typeof tableSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type QrSessionRequest = z.infer<typeof qrSessionRequestSchema>;