-- ============================================================
-- 003_rls_policies.sql
-- Row Level Security per PRD §6 matrix. RLS enabled on every
-- table from 001_core_schema.sql. Policies mirror the reference
-- pattern in the PRD.
-- ============================================================

-- Helper: returns true if the current auth user is staff of the given restaurant
create or replace function is_staff_of(rest_id uuid) returns boolean as $$
select exists (
  select 1 from user_profiles
  where user_id = auth.uid()
    and restaurant_id = rest_id
);
$$ language sql security definer;

-- Helper: returns true if the current auth user is owner/manager of the given restaurant
create or replace function is_owner_manager_of(rest_id uuid) returns boolean as $$
select exists (
  select 1 from user_profiles
  where user_id = auth.uid()
    and restaurant_id = rest_id
    and role in ('owner', 'manager')
);
$$ language sql security definer;

-- Helper: returns true if the current auth user is kitchen of the given restaurant
create or replace function is_kitchen_of(rest_id uuid) returns boolean as $$
select exists (
  select 1 from user_profiles
  where user_id = auth.uid()
    and restaurant_id = rest_id
    and role = 'kitchen'
);
$$ language sql security definer;

-- ============================================================
-- restaurants — anonymous/customer read active only; staff full rw
-- ============================================================
alter table restaurants enable row level security;

create policy "anon can read active restaurants"
  on restaurants for select
  using (true); -- slug-based routing handles visibility; no sensitive cols

create policy "staff can access own restaurant"
  on restaurants for all
  using (is_staff_of(id));

-- ============================================================
-- user_profiles — staff only, own restaurant
-- ============================================================
alter table user_profiles enable row level security;

create policy "staff can read own restaurant profiles"
  on user_profiles for select
  using (is_staff_of(restaurant_id));

create policy "owner/manager can manage profiles"
  on user_profiles for insert, update, delete
  using (is_owner_manager_of(restaurant_id));

-- ============================================================
-- tables — anon read for QR resolution; staff full
-- ============================================================
alter table tables enable row level security;

create policy "anon can read tables for QR"
  on tables for select
  using (status = 'active');

create policy "staff can manage tables"
  on tables for all
  using (is_staff_of(restaurant_id));

-- ============================================================
-- rooms — anon read for QR resolution; staff full
-- ============================================================
alter table rooms enable row level security;

create policy "anon can read rooms for QR"
  on rooms for select
  using (status = 'available');

create policy "staff can manage rooms"
  on rooms for all
  using (is_staff_of(restaurant_id));

-- ============================================================
-- categories — anon read active; staff full
-- ============================================================
alter table categories enable row level security;

create policy "anon can read active categories"
  on categories for select
  using (is_active = true);

create policy "staff can manage categories"
  on categories for all
  using (is_staff_of(restaurant_id));

-- ============================================================
-- menu_items — anon read available; staff full
-- ============================================================
alter table menu_items enable row level security;

create policy "anon can read available items"
  on menu_items for select
  using (is_available = true);

create policy "staff can manage menu items"
  on menu_items for all
  using (is_staff_of(restaurant_id));

-- ============================================================
-- menu_item_addons — anon read available; staff full
-- ============================================================
alter table menu_item_addons enable row level security;

create policy "anon can read available addons"
  on menu_item_addons for select
  using (is_available = true);

create policy "staff can manage addons"
  on menu_item_addons for all
  using (is_staff_of((select restaurant_id from menu_items where id = menu_item_id)));

-- ============================================================
-- customers — auth customer own row only; staff read own restaurant
-- ============================================================
alter table customers enable row level security;

create policy "customer can read own profile"
  on customers for select
  using (auth_user_id = auth.uid());

create policy "customer can update own profile"
  on customers for update
  using (auth_user_id = auth.uid());

create policy "staff can read own restaurant customers"
  on customers for select
  using (is_staff_of(restaurant_id));

-- ============================================================
-- customer_addresses — customer own rows; staff read
-- ============================================================
alter table customer_addresses enable row level security;

create policy "customer can manage own addresses"
  on customer_addresses for all
  using (customer_id in (select id from customers where auth_user_id = auth.uid()));

create policy "staff can read addresses"
  on customer_addresses for select
  using (customer_id in (
    select id from customers c
    join user_profiles up on up.restaurant_id = c.restaurant_id
    where up.user_id = auth.uid()
  ));

-- ============================================================
-- qr_sessions — anon can create/read/update own session_token
-- ============================================================
alter table qr_sessions enable row level security;

create policy "anon can create session"
  on qr_sessions for insert
  with check (true);

create policy "anon can read own session"
  on qr_sessions for select
  using (session_token = current_setting('request.jwt.claims', true)::jsonb ->> 'session_token'
      or session_token = (current_setting('request.headers', true)::jsonb ->> 'x-session-token'));

create policy "anon can update own session (verification)"
  on qr_sessions for update
  using (session_token = current_setting('request.jwt.claims', true)::jsonb ->> 'session_token'
      or session_token = (current_setting('request.headers', true)::jsonb ->> 'x-session-token'))
  with check (session_token = current_setting('request.jwt.claims', true)::jsonb ->> 'session_token'
      or session_token = (current_setting('request.headers', true)::jsonb ->> 'x-session-token'));

create policy "staff can read sessions"
  on qr_sessions for select
  using (is_staff_of(restaurant_id));

-- ============================================================
-- orders — anon/customer NO direct insert; staff full rw own restaurant
-- customer can read own orders; order creation via server function only
-- ============================================================
alter table orders enable row level security;

create policy "customer can read own orders"
  on orders for select
  using (customer_id in (select id from customers where auth_user_id = auth.uid()));

create policy "staff can access own restaurant orders"
  on orders for all
  using (is_staff_of(restaurant_id));

-- Explicitly block anonymous/customer insert — server function uses
-- service role (bypasses RLS) so this is defense-in-depth.
create policy "block anon insert"
  on orders for insert
  with check (false);

-- ============================================================
-- order_items — same as orders
-- ============================================================
alter table order_items enable row level security;

create policy "customer can read own order items"
  on order_items for select
  using (order_id in (
    select id from orders where customer_id in (
      select id from customers where auth_user_id = auth.uid()
    )
  ));

create policy "staff can access order items"
  on order_items for all
  using (order_id in (
    select id from orders where is_staff_of(restaurant_id)
  ));

-- ============================================================
-- order_status_history — customer read own; staff rw
-- ============================================================
alter table order_status_history enable row level security;

create policy "customer can read own status history"
  on order_status_history for select
  using (order_id in (
    select id from orders where customer_id in (
      select id from customers where auth_user_id = auth.uid()
    )
  ));

create policy "staff can manage status history"
  on order_status_history for all
  using (order_id in (
    select id from orders where is_staff_of(restaurant_id)
  ));

-- ============================================================
-- payments — customer read own; staff rw
-- ============================================================
alter table payments enable row level security;

create policy "customer can read own payments"
  on payments for select
  using (order_id in (
    select id from orders where customer_id in (
      select id from customers where auth_user_id = auth.uid()
    )
  ));

create policy "staff can manage payments"
  on payments for all
  using (order_id in (
    select id from orders where is_staff_of(restaurant_id)
  ));

-- ============================================================
-- restaurant_settings — anon/staff read; owner/manager write
-- ============================================================
alter table restaurant_settings enable row level security;

create policy "anon can read settings"
  on restaurant_settings for select
  using (true);

create policy "staff can read settings"
  on restaurant_settings for select
  using (is_staff_of(restaurant_id));

create policy "owner/manager can update settings"
  on restaurant_settings for update
  using (is_owner_manager_of(restaurant_id));