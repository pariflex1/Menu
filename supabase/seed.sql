-- ============================================================
-- seed.sql — Demo data for local development / CI.
-- Run AFTER all migrations (001, 002, 003).
-- ============================================================

-- Insert demo restaurant
insert into restaurants (id, name, slug, phone, email, address, currency, timezone)
values (
  '11111111-1111-1111-1111-111111111111',
  'The Grand Bistro',
  'grand-bistro',
  '+91 98765 43210',
  'orders@grandbistro.example',
  '123 MG Road, Bangalore, Karnataka 560001',
  'INR',
  'Asia/Kolkata'
) on conflict (slug) do nothing;

-- Restaurant settings (tax 5%, delivery ₹30, min order ₹200)
insert into restaurant_settings (
  restaurant_id, tax_percent, home_delivery_enabled, room_service_enabled,
  table_ordering_enabled, min_home_order_amount, delivery_fee,
  opening_time, closing_time, manual_override
) values (
  '11111111-1111-1111-1111-111111111111',
  5.00, true, true, true, 200.00, 30.00,
  '09:00', '23:00', null
) on conflict (restaurant_id) do nothing;

-- Categories
insert into categories (id, restaurant_id, name, description, sort_order, is_active) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Starters', 'Appetizers and small plates', 1, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Main Course', 'Hearty main dishes', 2, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Beverages', 'Drinks and refreshments', 3, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Desserts', 'Sweet endings', 4, true)
on conflict (id) do nothing;

-- Tables (QR tokens are short opaque strings)
insert into tables (id, restaurant_id, table_number, capacity, status, qr_token) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'T01', 2, 'active', 'T01-XYZ789'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'T02', 4, 'active', 'T02-ABC456'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'T03', 6, 'active', 'T03-DEF123')
on conflict (qr_token) do nothing;

-- Rooms
insert into rooms (id, restaurant_id, room_number, floor, status, qr_token) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '101', '1', 'available', 'R101-GHI789'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '102', '1', 'available', 'R102-JKL012'),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '201', '2', 'available', 'R201-MNO345')
on conflict (qr_token) do nothing;

-- Menu items — Starters
insert into menu_items (id, restaurant_id, category_id, name, description, price, veg_type, is_available, is_featured, sort_order) values
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Paneer Tikka', 'Cottage cheese marinated in spices, grilled to perfection', 280.00, 'veg', true, true, 1),
  ('88888888-8888-8888-8888-888888888889', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Chicken 65', 'Spicy deep-fried chicken, a South Indian classic', 320.00, 'non_veg', true, true, 2),
  ('88888888-8888-8888-8888-888888888890', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Veg Spring Rolls', 'Crispy rolls with mixed vegetables', 180.00, 'veg', true, false, 3)
on conflict (id) do nothing;

-- Menu items — Main Course
insert into menu_items (id, restaurant_id, category_id, name, description, price, veg_type, is_available, is_featured, sort_order) values
  ('99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Butter Paneer', 'Paneer in rich tomato-cashew gravy', 260.00, 'veg', true, true, 1),
  ('99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Chicken Butter Masala', 'Tender chicken in creamy tomato gravy', 340.00, 'non_veg', true, true, 2),
  ('99999999-9999-9999-9999-999999999993', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Dal Makhani', 'Slow-cooked black lentils with butter and cream', 220.00, 'veg', true, false, 3),
  ('99999999-9999-9999-9999-999999999994', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Veg Biryani', 'Fragrant basmati rice with mixed vegetables', 240.00, 'veg', true, false, 4)
on conflict (id) do nothing;

-- Menu items — Beverages
insert into menu_items (id, restaurant_id, category_id, name, description, price, veg_type, is_available, is_featured, sort_order) values
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Masala Chai', 'Spiced Indian tea', 40.00, 'veg', true, false, 1),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Fresh Lime Soda', 'Sweet or salted', 60.00, 'veg', true, false, 2),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Cold Coffee', 'Chilled coffee with ice cream', 120.00, 'veg', true, false, 3)
on conflict (id) do nothing;

-- Menu items — Desserts
insert into menu_items (id, restaurant_id, category_id, name, description, price, veg_type, is_available, is_featured, sort_order) values
  ('bbbbbbbb-cccc-dddd-eeee-fffffffffff1', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Gulab Jamun', 'Soft milk-solid dumplings in rose syrup', 100.00, 'veg', true, false, 1),
  ('bbbbbbbb-cccc-dddd-eeee-fffffffffff2', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Chocolate Brownie', 'Warm fudgy brownie with vanilla ice cream', 160.00, 'egg', true, false, 2)
on conflict (id) do nothing;

-- Addons
insert into menu_item_addons (id, menu_item_id, name, price, is_available) values
  ('cccccccc-dddd-eeee-ffff-000000000001', '88888888-8888-8888-8888-888888888888', 'Extra Mint Chutney', 20.00, true),
  ('cccccccc-dddd-eeee-ffff-000000000002', '99999999-9999-9999-9999-999999999991', 'Extra Butter', 30.00, true),
  ('cccccccc-dddd-eeee-ffff-000000000003', '99999999-9999-9999-9999-999999999992', 'Extra Gravy', 40.00, true)
on conflict (id) do nothing;