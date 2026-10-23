-- Migration: 005_rooms_101_135.sql
-- Adds the full ground-floor room inventory (101-135) for Krishna Anandam.
-- Existing rooms keep their current QR tokens; only missing numbers are inserted.

insert into rooms (restaurant_id, room_number, floor, status, qr_token)
select
  r.id,
  n::text,
  '1',
  'available',
  'R' || n::text || '-KA2026'
from generate_series(101, 135) as n
join restaurants r on r.id = '11111111-1111-1111-1111-111111111111'
on conflict (restaurant_id, room_number) do nothing;
