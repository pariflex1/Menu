-- ============================================================
-- KRISHNA ANANDAM - Single Restaurant Database Schema
-- Simplified, high-performance schema without multi-tenant overhead
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- store_settings (Singleton) ----------
create table if not exists store_settings (
  id                      uuid primary key default '11111111-1111-1111-1111-111111111111',
  name                    text not null default 'KRISHNA ANANDAM',
  slug                    text not null default 'krishna-anandam',
  logo_url                text,
  phone                   text not null default '+91 91290 54406, +91 92085 50807',
  email                   text not null default 'krishnaanandam08@gmail.com',
  address                 text not null default 'Plot No. E-17, Sector-2, Rukmani Vihar, Opposite Sanskar City, Vrindavan, Mathura (UP) 281121',
  currency                text not null default 'INR',
  currency_symbol         text not null default '₹',
  timezone                text not null default 'Asia/Kolkata',
  tax_name                text not null default 'GST',
  tax_percent             numeric(5,2) not null default 5.00,
  price_display           text not null default 'excluding_tax',
  table_ordering_enabled  boolean not null default true,
  room_service_enabled    boolean not null default true,
  home_delivery_enabled   boolean not null default true,
  min_home_order_amount   numeric(10,2) not null default 100.00,
  delivery_fee            numeric(10,2) not null default 30.00,
  opening_time            time not null default '07:30',
  closing_time            time not null default '23:00',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------- user_profiles (Staff Auth) ----------
create table if not exists user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  name          text not null,
  phone         text,
  role          text not null check (role in ('owner','manager','kitchen','staff')),
  created_at    timestamptz not null default now()
);

-- ---------- tables ----------
create table if not exists tables (
  id            uuid primary key default gen_random_uuid(),
  table_number  text not null unique,
  capacity      integer,
  status        text not null default 'active' check (status in ('active','inactive','maintenance')),
  qr_token      text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- rooms ----------
create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  room_number   text not null unique,
  floor         text,
  status        text not null default 'available' check (status in ('available','occupied','maintenance','inactive')),
  qr_token      text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  image_url     text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- menu_items ----------
create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  image_url     text,
  veg_type      text not null default 'veg' check (veg_type in ('veg','non_veg','egg')),
  is_available  boolean not null default true,
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if idx_menu_items_category on menu_items(category_id);

-- ---------- menu_item_addons ----------
create table if not exists menu_item_addons (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  name          text not null,
  price         numeric(10,2) not null default 0 check (price >= 0),
  is_available  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- qr_sessions ----------
create table if not exists qr_sessions (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid references tables(id) on delete set null,
  room_id       uuid references rooms(id) on delete set null,
  token         text not null unique,
  status        text not null default 'active' check (status in ('active','expired','invalidated')),
  device_info   text,
  ip_address    inet,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '5 minutes'),
  check (
    (table_id is not null and room_id is null) or
    (table_id is null and room_id is not null)
  )
);

-- ---------- orders ----------
create table if not exists orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique,
  order_type           text not null check (order_type in ('table','room','home')),
  table_id             uuid references tables(id) on delete set null,
  room_id              uuid references rooms(id) on delete set null,
  customer_name        text,
  customer_phone       text,
  customer_address     text,
  status               text not null default 'new'
                       check (status in ('new','accepted','preparing','ready','out_for_delivery','delivered','served','completed','cancelled','rejected')),
  subtotal             numeric(10,2) not null check (subtotal >= 0),
  tax_amount           numeric(10,2) not null default 0 check (tax_amount >= 0),
  delivery_fee         numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total_amount         numeric(10,2) not null check (total_amount >= 0),
  payment_status       text not null default 'pending'
                       check (payment_status in ('pending','paid','failed','refunded')),
  payment_method       text check (payment_method in ('upi','card','cash','room_bill')),
  notes                text,
  rejection_reason     text,
  cancellation_reason  text,
  idempotency_key      text unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------- order_items ----------
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  menu_item_id  uuid not null references menu_items(id) on delete restrict,
  item_name     text not null,
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  subtotal      numeric(10,2) not null check (subtotal >= 0),
  notes         text,
  addons        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- ---------- order_status_history ----------
create table if not exists order_status_history (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  from_status         text,
  to_status           text not null,
  changed_by_staff_id uuid references user_profiles(id) on delete set null,
  reason              text,
  created_at          timestamptz not null default now()
);

-- Sequence for daily order numbers
create sequence if not exists order_seq start 1;

create or replace function generate_order_number()
returns trigger as $$
declare
  seq_val integer;
  date_part text;
begin
  if new.order_number is null or new.order_number = '' then
    select nextval('order_seq') into seq_val;
    date_part := to_char(now(), 'YYMMDD');
    new.order_number := 'KA-' || date_part || '-' || lpad(seq_val::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_generate_order_number on orders;
create trigger trg_generate_order_number
before insert on orders
for each row execute function generate_order_number();

-- Enable Row Level Security (RLS)
alter table store_settings enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_addons enable row level security;
alter table tables enable row level security;
alter table rooms enable row level security;
alter table qr_sessions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table user_profiles enable row level security;

-- Public read policies
create policy "Public can view store settings" on store_settings for select using (true);
create policy "Public can view active categories" on categories for select using (is_active = true);
create policy "Public can view available menu items" on menu_items for select using (is_available = true);
create policy "Public can view addons" on menu_item_addons for select using (is_available = true);
create policy "Public can view active tables" on tables for select using (true);
create policy "Public can view available rooms" on rooms for select using (true);
create policy "Public can view/insert qr sessions" on qr_sessions for all using (true) with check (true);
create policy "Public can create orders" on orders for insert with check (true);
create policy "Public can view their order" on orders for select using (true);
create policy "Public can insert order items" on order_items for insert with check (true);
create policy "Public can view order items" on order_items for select using (true);
create policy "Public can view order history" on order_status_history for select using (true);
