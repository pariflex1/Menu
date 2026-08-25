import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative().multipleOf(0.01),
  image_url: z.string().url().optional().or(z.literal('')),
  veg_type: z.enum(['veg', 'non_veg', 'egg', 'none']).default('none'),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
});

export const addonSchema = z.object({
  id: z.string().uuid().optional(),
  menu_item_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().nonnegative().multipleOf(0.01).default(0),
  is_available: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type AddonInput = z.infer<typeof addonSchema>;