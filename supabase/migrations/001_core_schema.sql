-- ============================================================
-- 001_core_schema.sql
-- Literal schema from PRD §5. Enum values enforced via CHECK
-- constraints (portable, easy to alter later).
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- restaurants (tenant root) ----------
create table restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  phone         text,
  email         text,
  address       text,
  currency      text not null default 'INR',
  timezone      text not null default 'Asia/Kolkata',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- user_profiles (staff; auth.users is Supabase Auth) ----------
create table user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  phone         text,
  role          text not null check (role in ('owner','manager','kitchen','staff')),
  created_at    timestamptz not null default now()
);
create index idx_user_profiles_restaurant on user_profiles(restaurant_id);

-- ---------- tables ----------
create table tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number  text not null,
  capacity      integer,
  status        text not null default 'active' check (status in ('active','inactive','maintenance')),
  qr_token      text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, table_number)
);
create index idx_tables_restaurant on tables(restaurant_id);
create index idx_tables_qr_token on tables(qr_token);

-- ---------- rooms ----------
create table rooms (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  room_number   text not null,
  floor         text,
  status        text not null default 'available' check (status in ('available','occupied','maintenance','inactive')),
  qr_token      text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, room_number)
);
create index idx_rooms_restaurant on rooms(restaurant_id);
create index idx_rooms_qr_token on rooms(qr_token);

-- ---------- categories ----------
create table categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  image_url     text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_categories_restaurant on categories(restaurant_id);

-- ---------- menu_items ----------
create table menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete restrict,
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  image_url     text,
  veg_type      text not null default 'none' check (veg_type in ('veg','non_veg','egg','none')),
  is_available  boolean not null default true,
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_menu_items_restaurant on menu_items(restaurant_id);
create index idx_menu_items_category on menu_items(category_id);

-- ---------- menu_item_addons ----------
create table menu_item_addons (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  name          text not null,
  price         numeric(10,2) not null default 0 check (price >= 0),
  is_available  boolean not null default true
);
create index idx_addons_menu_item on menu_item_addons(menu_item_id);

-- ---------- customers (home-delivery accounts, phone-based) ----------
create table customers (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  phone         text not null unique,
  name          text,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------- customer_addresses ----------
create table customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  label           text not null default 'Home' check (label in ('Home','Work','Other')),
  name            text not null,
  phone           text not null,
  address_line_1  text not null,
  address_line_2  text,
  landmark        text,
  city            text not null,
  state           text not null,
  pincode         text not null,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_addresses_customer on customer_addresses(customer_id);

-- ---------- qr_sessions ----------
create table qr_sessions (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  qr_token       text not null,
  source_type    text not null check (source_type in ('table','room')),
  source_id      uuid not null, -- FK to tables.id or rooms.id; enforced in app code
  session_token  text not null unique,
  started_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  customer_id    uuid references customers(id),
  is_verified    boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_qr_sessions_token on qr_sessions(session_token);
create index idx_qr_sessions_restaurant on qr_sessions(restaurant_id);

-- ---------- orders ----------
create table orders (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references restaurants(id) on delete cascade,
  order_number          integer not null, -- human-facing, sequential per restaurant; see §9.3
  customer_id           uuid references customers(id),

  order_type            text not null check (order_type in ('table','room','home')),
  table_id              uuid references tables(id),
  room_id               uuid references rooms(id),
  qr_session_id         uuid references qr_sessions(id),

  customer_name         text not null,
  customer_phone        text not null,
  delivery_address_id   uuid references customer_addresses(id),

  subtotal              numeric(10,2) not null check (subtotal >= 0),
  tax                    numeric(10,2) not null default 0 check (tax >= 0),
  discount               numeric(10,2) not null default 0 check (discount >= 0),
  delivery_fee           numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total                  numeric(10,2) not null check (total >= 0),

  payment_method         text not null default 'cash' check (payment_method in ('cash','upi_manual','room_bill','gateway')),
  payment_status          text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded','cash','room_bill')),

  status                 text not null default 'new' check (
    status in ('new','accepted','preparing','ready','served','completed','cancelled','out_for_delivery','delivered')
  ),

  idempotency_key        text not null unique, -- see §9.4
  notes                  text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint chk_order_context check (
    (order_type = 'table' and table_id is not null and room_id is null and delivery_address_id is null) or
    (order_type = 'room'  and room_id  is not null and table_id is null and delivery_address_id is null) or
    (order_type = 'home'  and delivery_address_id is not null and table_id is null and room_id is null)
  ),
  unique (restaurant_id, order_number)
);
create index idx_orders_restaurant on orders(restaurant_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(restaurant_id, status);
create index idx_orders_created on orders(restaurant_id, created_at desc);

-- ---------- order_items (price/name snapshotted — see Agent Rule #3) ----------
create table order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  menu_item_id  uuid references menu_items(id), -- nullable: item may be deleted later, snapshot survives
  item_name     text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  total_price   numeric(10,2) not null check (total_price >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);
create index idx_order_items_order on order_items(order_id);

-- ---------- order_status_history (audit trail) ----------
create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  status      text not null,
  changed_by  uuid references auth.users(id),
  notes       text,
  created_at  timestamptz not null default now()
);
create index idx_status_history_order on order_status_history(order_id);

-- ---------- payments ----------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  provider        text not null default 'none' check (provider in ('none','razorpay','cashfree','phonepe')),
  provider_ref    text,
  amount          numeric(10,2) not null check (amount >= 0),
  status          text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  raw_payload     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_payments_order on payments(order_id);

-- ---------- restaurant_settings ----------
create table restaurant_settings (
  restaurant_id         uuid primary key references restaurants(id) on delete cascade,
  tax_percent           numeric(5,2) not null default 5.00,
  home_delivery_enabled boolean not null default true,
  room_service_enabled  boolean not null default true,
  table_ordering_enabled boolean not null default true,
  min_home_order_amount numeric(10,2) not null default 0,
  delivery_fee          numeric(10,2) not null default 0,
  opening_time           time not null default '09:00',
  closing_time           time not null default '23:00',
  manual_override        text check (manual_override in ('open','closed')), -- null = follow opening/closing_time
  updated_at             timestamptz not null default now()
);

-- ============================================================
-- updated_at maintenance triggers (per table that has updated_at)
-- ============================================================
create or replace function trg_set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_restaurants
  before update on restaurants
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_tables
  before update on tables
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_rooms
  before update on rooms
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_categories
  before update on categories
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_menu_items
  before update on menu_items
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_customers
  before update on customers
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_customer_addresses
  before update on customer_addresses
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_orders
  before update on orders
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_payments
  before update on payments
  for each row execute function trg_set_updated_at();

create trigger set_updated_at_restaurant_settings
  before update on restaurant_settings
  for each row execute function trg_set_updated_at();