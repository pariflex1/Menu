# PRD — QR-Based Hotel & Restaurant Ordering Platform

**Version:** 1.0 (restructured for AI-agent implementation)
**Date:** 14 August 2026
**Stack:** Next.js (App Router, TS) + Supabase (Postgres, Auth, Realtime, Storage) + Vercel + Cloudflare
**Architecture:** Multi-tenant-ready from day one; first deployment is single-tenant.

> This document is written to be read and executed by an AI coding agent (e.g. Claude Code), not just a human. Every rule that affects correctness or security is stated explicitly and is not left to inference. Where the original draft used prose or ASCII diagrams to describe a schema, API, or state machine, this version gives the literal artifact (SQL, JSON, or a transition table) instead, so the agent implements it rather than reinterprets it.

---

## 0. Read This First — Agent Operating Rules

These rules apply to every phase in this document. They override convenience or speed if the two conflict.

1. **Work in phases, not all at once.** Implement only the phase you are told to implement (see §14). Do not start the next phase's tables, routes, or UI early.
2. **Never trust client input for money or identity.** `price`, `subtotal`, `tax`, `total`, `delivery_fee`, `restaurant_id`, `table_id`, `room_id`, `customer_id`, and `role` must always be re-derived server-side from the database, never accepted as-is from the request body. See §9 for the canonical order-creation algorithm.
3. **Snapshot, don't reference, at order time.** `order_items.item_name` and `order_items.unit_price` are copied from `menu_items` at the moment of order creation and never updated afterward, even if the menu item changes later. This is a hard requirement, not an optimization.
4. **No schema change without a migration.** Every database change is a new file under `supabase/migrations/`. Never edit an already-applied migration. State in your response what the migration does before running it.
5. **No hardcoded IDs, prices, tax rates, or credentials.** These come from the database (`restaurant_settings`, `menu_items`) or environment variables — never literals in code.
6. **Every feature ships complete or not at all**, meaning: implementation + input validation + error handling + loading state + empty state + the relevant RLS policy + at least one automated test. A feature missing any of these is not "done."
7. **Do not advance to the next phase** until every acceptance-criteria checkbox for the current phase (§14) is genuinely true, not assumed.
8. **When the spec is ambiguous, stop and ask** rather than silently choosing an interpretation — particularly for anything touching money, session expiry, or RLS.

---

## 1. Glossary

| Term | Meaning |
|---|---|
| **Order channel** | One of `table`, `room`, `home` — how the order originated. Stored as `orders.order_type`. |
| **Order context** | The table/room/delivery-address an order is tied to. Independent of customer identity (see §2). |
| **QR session** | A short-lived, server-issued token proving "this browser scanned this table/room's QR recently." Not a login. |
| **Verification** | Establishing customer identity (name + mobile, optionally OTP) when a QR session has expired. |
| **Bucket** | The client-side cart, called "bucket" in all UI copy (not "cart"). |
| **Snapshot pricing** | Storing the item name/price on the order at creation time, immune to later menu edits. |
| **Tenant** | A single `restaurants` row. All tenant-scoped tables carry `restaurant_id` and are isolated by RLS. |

---

## 2. Product Overview

Customers order food via a mobile-first web app through three channels:

| Channel | Entry point | Identity requirement |
|---|---|---|
| Table | Scan table QR | QR session only, unless expired |
| Room | Scan room QR | QR session only, unless expired |
| Home / delivery | Visit website directly | Mobile OTP always required |

**Core design principle — keep these two concerns separate:**

```
ORDER CONTEXT (where)          CUSTOMER IDENTITY (who)
├── Table 12                   └── Name + verified mobile (OTP)
├── Room 205
└── Home delivery address
```

This lets a table/room customer order in seconds without login, while still supporting accounts, order history, and repeat customers for home delivery. Do not merge these two models later for convenience — it breaks the anonymous fast-order path.

### Core flow

```
QR scan (table/room) ──┐
Website (home) ─────────┼──► Menu ──► Bucket ──► Checkout
                         │                          │
                         │              ┌───────────┴───────────┐
                         │        QR session valid?        Home order?
                         │              │                        │
                         │        yes → place order        OTP required
                         │        no  → verify (rescan             │
                         │              or name+mobile)      place order
                         ▼
                  order created ──► Realtime push ──► Manager dashboard
                                                       ──► Kitchen view
                                                       ──► Customer tracking
```

---

## 3. Goals / Non-Goals

**In scope for MVP:** replace physical menus; QR table ordering; QR room-service ordering; home delivery ordering; centralized real-time order dashboard; secure table/room identification; QR-session abuse prevention; customer accounts for home orders; order history; staff menu/availability management.

**Explicitly out of scope for MVP** (do not build, do not scaffold, do not leave TODOs for): loyalty program, reviews, AI chatbot, multi-restaurant marketplace, advanced accounting, POS hardware integration, kitchen printer integration, complex inventory/stock counts, delivery-partner marketplace. These are Phase 2 (post-MVP) and are listed only so the agent doesn't accidentally build toward them.

---

## 4. Tech Stack (fixed — do not substitute)

**Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query where it reduces boilerplate. Customer-facing UI is mobile-first; admin UI is desktop/tablet-first.

**Backend:** Supabase only — Postgres, Supabase Auth, Realtime, Storage, Row Level Security, Edge Functions where server-only logic is needed (e.g. OTP dispatch, payment webhook verification). **Do not stand up a separate Node/Express service.** Next.js Route Handlers / Server Actions are the API layer; Supabase is the backend.

---

## 5. Data Model — SQL DDL

This is the literal schema to migrate. Enum values are enforced with Postgres `CHECK` constraints (portable, easy to alter later) rather than native `ENUM` types.

```sql
-- ============================================================
-- 001_core_schema.sql
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
  source_id      uuid not null, -- FK to tables.id or rooms.id depending on source_type; enforced in application code, not DB
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
```

**Order-number generation (§9.3 references this):** use a Postgres sequence per restaurant, or a single global sequence with the uniqueness enforced by `unique (restaurant_id, order_number)` above plus a `before insert` trigger that does `select coalesce(max(order_number),1000)+1 from orders where restaurant_id = new.restaurant_id for update` inside the same transaction to avoid race conditions. Do not generate order numbers client-side.

---

## 6. Row Level Security

RLS must be **enabled on every table above** (`alter table x enable row level security;`). The rule set is:

| Table | Anonymous / QR customer | Authenticated customer | Staff (own restaurant) | Cross-tenant |
|---|---|---|---|---|
| `restaurants`, `categories`, `menu_items`, `menu_item_addons` | read-only, `is_active`/`is_available` rows only | same | full read/write | denied |
| `tables`, `rooms` | read-only (for QR resolution) | same | full read/write | denied |
| `qr_sessions` | can create; can read/update only the row matching their own `session_token` | same | read-only, own restaurant | denied |
| `customers`, `customer_addresses` | no access | read/write **own row only** (`auth.uid() = customers.auth_user_id`) | read-only, own restaurant's customers | denied |
| `orders`, `order_items`, `order_status_history` | can create via server-side function only (never direct insert); cannot read | read own orders only (`orders.customer_id` matches) | full read/write, own restaurant only | denied |
| `payments` | no access | read own | own restaurant only | denied |
| `restaurant_settings` | read-only | same | owner/manager write, others read | denied |

Reference policy pattern (repeat per table, substituting the table name and ownership column):

```sql
alter table orders enable row level security;

create policy "staff can access own restaurant orders"
on orders for all
using (
  restaurant_id in (
    select restaurant_id from user_profiles where user_id = auth.uid()
  )
);

create policy "customers can read own orders"
on orders for select
using (
  customer_id in (
    select id from customers where auth_user_id = auth.uid()
  )
);
```

**Order creation never happens via a direct client `insert`.** It goes through a server-side Route Handler / Postgres function running with the service role (or `security definer`), which performs the price recalculation in §9 before writing. RLS on `orders` therefore only needs to cover *reads* and staff *writes*; block anonymous/customer `insert` entirely at the policy level as a defense-in-depth measure even though the app never attempts it client-side.

**Tenant isolation invariant:** every query in every Route Handler must filter by `restaurant_id` explicitly, in addition to RLS. RLS is the last line of defense, not the only one — never rely on it exclusively for a multi-tenant guarantee.

---

## 7. QR & Session Architecture

**Token design:** `tables.qr_token` / `rooms.qr_token` are opaque random strings (e.g. `nanoid(12)`), never the row's UUID or a predictable sequence. URL shape: `https://{restaurant-domain}/q/{qr_token}`.

**Resolution:** the token is looked up against `tables` first, then `rooms`, to determine `source_type` and `source_id`. If neither matches, or the row's `status` is not `active`/`available`, return 404 — do not reveal whether the token almost matched something.

**Session lifecycle:**

- `POST /api/qr/session` — see §8 for the contract.
- `expires_at = started_at + interval '5 minutes'`, fixed, not configurable per-request.
- The 5-minute check happens **only** at the moment the customer presses "Place Order" — never interrupt browsing to re-verify. This is a UX requirement, not just an implementation detail: the timer is invisible until checkout.
- On expiry at checkout: show `"Your ordering session has expired."` with two actions — **Scan QR Again** or **Continue with Name & Mobile**. Both preserve the client-side bucket; neither clears it.
- Re-scanning the same QR always creates a **new** `qr_sessions` row; it never updates/extends the old one (the old one is left to expire naturally, useful for audit).
- Name+mobile verification, when OTP infrastructure isn't wired up yet, still goes through the same API shape (`is_verified` flips to `true` on success) so the OTP provider can be swapped in later without changing the contract.

---

## 8. API Contracts

All endpoints are Next.js Route Handlers under `app/api/`. Every mutating endpoint requires the caller to already hold a valid `qr_session` (table/room) or authenticated `customer` (home) — enforced server-side, not just hidden in the UI.

### `POST /api/qr/session`
Resolve a scanned QR token into a session.

Request:
```json
{ "qr_token": "8fK92Lm" }
```
Response `200`:
```json
{
  "session_token": "s_9c2e...",
  "source_type": "table",
  "source_name": "Table 12",
  "restaurant": { "id": "uuid", "name": "Restaurant XYZ", "slug": "restaurant-xyz" },
  "started_at": "2026-08-14T18:30:00Z",
  "expires_at": "2026-08-14T18:35:00Z"
}
```
Errors: `404 { "error": "invalid_qr_token" }` if token doesn't resolve or source is inactive.

### `GET /api/menu?restaurant_id=...`
Public. Returns categories with nested available items. Items with `is_available=false` are still returned but flagged, so the UI can show "Currently unavailable" rather than silently hiding them (matches §11 rule).

Response `200`:
```json
{
  "categories": [
    {
      "id": "uuid", "name": "Starters", "sort_order": 1,
      "items": [
        {
          "id": "uuid", "name": "Paneer Tikka", "description": "...",
          "price": 280.00, "veg_type": "veg", "is_available": true,
          "image_url": "...", "addons": [{ "id": "uuid", "name": "Extra Cheese", "price": 40 }]
        }
      ]
    }
  ]
}
```

### `POST /api/orders`
Creates an order. This is the single most security-sensitive endpoint — see §9 for the full algorithm it must implement.

Request:
```json
{
  "idempotency_key": "client-generated-uuid-v4",
  "session_token": "s_9c2e...",
  "order_type": "table",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "addon_ids": ["uuid"], "notes": "less spicy" }
  ],
  "customer_name": "Rahul",
  "customer_phone": "98XXXXXXXX",
  "delivery_address_id": null,
  "payment_method": "cash",
  "notes": ""
}
```
Response `201`:
```json
{
  "order": {
    "id": "uuid", "order_number": 1048, "status": "new",
    "subtotal": 460.00, "tax": 23.00, "total": 483.00
  }
}
```
Errors:
- `409 { "error": "duplicate_request" }` — `idempotency_key` already used; return the original order instead of erroring the user (see §9.4).
- `410 { "error": "session_expired" }` — QR session expired and no verification supplied.
- `422 { "error": "item_unavailable", "item_id": "uuid" }` — an item in the bucket went out of stock between add-to-bucket and checkout.
- `422 { "error": "restaurant_closed" }`.

### `GET /api/orders/:id` and `PATCH /api/orders/:id/status`
`GET` — customer sees own order only (RLS-enforced); staff see any order in their restaurant.
`PATCH` — staff only. Body: `{ "status": "preparing" }`. Must validate the transition against the state machine in §9.2 before writing; invalid transitions return `409 { "error": "invalid_transition", "from": "new", "to": "served" }`.

### Admin endpoints
`/api/admin/menu`, `/api/admin/tables`, `/api/admin/rooms`, `/api/admin/qr` — standard CRUD, staff-only, role-gated per §12. Follow the same request/response conventions as above; don't invent a different shape per resource.

---

## 9. Order Creation — Canonical Algorithm

This is the exact sequence `POST /api/orders` must perform, server-side, inside a single transaction:

1. **Idempotency check.** If a row with this `idempotency_key` already exists, return it with `200` (not `201`) instead of creating a duplicate. This is what makes double-tapping "Place Order" safe.
2. **Resolve context.**
   - `table`/`room`: look up the `qr_session` by `session_token`. If `now() > expires_at` and `is_verified = false`, return `410 session_expired`. If verified (rescanned or name+mobile flow completed), proceed.
   - `home`: require an authenticated `customer_id` and a `delivery_address_id` belonging to that customer.
3. **Re-fetch every menu item server-side** by `menu_item_id`. Reject (`422`) if any item is missing, `is_available = false`, or belongs to a different `restaurant_id` than the session/context.
4. **Recompute prices from the database, ignoring any price sent by the client.** For each line: `unit_price = menu_items.price` (+ addon prices), `total_price = unit_price * quantity`.
5. **Compute order totals server-side:** `subtotal = sum(line totals)`, `tax = subtotal * restaurant_settings.tax_percent / 100`, `delivery_fee` from settings for home orders only, `total = subtotal + tax + delivery_fee - discount`.
6. **Check business hours** against `restaurant_settings` (see §11) unless `manual_override = 'open'`.
7. **Generate the next `order_number`** for this restaurant atomically (see §5 note).
8. **Insert** `orders`, then `order_items` (snapshotting `item_name`/`unit_price` per Agent Rule #3), then an initial `order_status_history` row with `status = 'new'`.
9. **Commit**, then trigger the Realtime-visible change (Postgres row insert is enough — Supabase Realtime picks it up; no separate event bus needed).
10. Client clears the bucket only after receiving `201`/`200` — never optimistically before the server confirms.

### 9.1 What the client is allowed to send vs. what the server trusts

| Field | Client sends it? | Server trusts it? |
|---|---|---|
| `menu_item_id`, `quantity`, `addon_ids` | yes | yes — used to *look up* price, not as the price |
| `unit_price`, `subtotal`, `total`, `tax` | no — server never reads these even if present in the body | n/a |
| `restaurant_id`, `table_id`, `room_id` | derived from `session_token`, not from the body | n/a |
| `customer_id` | derived from the authenticated session, not from the body | n/a |
| `customer_name`, `customer_phone`, `notes` | yes | yes (free text, not security-sensitive) |

### 9.2 Order status state machine

```
new ──► accepted ──► preparing ──► ready ──► served ──► completed
 │                                                          
 └──────────────────────────────────────────────────► cancelled

Home delivery only, inserted between ready and delivered:
ready ──► out_for_delivery ──► delivered ──► completed
```

Rules:
- Forward transitions only, one step at a time, except `cancelled`, which is reachable from any state **except** `completed` or `delivered`.
- `cancelled` and `completed`/`delivered` are terminal — no further transitions.
- Every transition writes a row to `order_status_history` with `changed_by` set to the staff `auth.uid()` performing it.
- The transition endpoint (`PATCH /api/orders/:id/status`) must reject any transition not in this diagram with `409`, never silently coerce it.

### 9.3 Order numbering
Sequential, human-readable, scoped per restaurant, starting at 1001. Never expose the internal UUID as the customer-facing identifier.

### 9.4 Idempotency
Client generates a UUID v4 as `idempotency_key` once when the user lands on checkout and reuses it for every retry of that same checkout attempt (regenerate only if the bucket contents change). Server enforces uniqueness via the `unique` constraint on `orders.idempotency_key` in §5.

---

## 10. Frontend Requirements

### 10.1 Screens (condensed — full copy/wording is a design-phase detail, not a spec requirement)

| Screen | Table/Room variant | Home variant |
|---|---|---|
| Landing | Shows restaurant name + table/room label, single CTA to menu | Shows restaurant name + "Start Ordering" CTA |
| Menu | Category nav, item cards (image, name, veg indicator, price, qty stepper), sticky bottom bucket bar | same |
| Bucket | Line items with qty controls, subtotal/tax/total | same |
| Checkout | Name + mobile fields, place-order button | Delivery address picker, payment method, place-order button |
| Confirmation | Order number, context, total, link to tracking | same + ETA |
| Tracking | Realtime status stepper (no manual refresh) | same + delivery status |

### 10.2 Manager dashboard
Sections: today's summary (orders/revenue/channel breakdown), live order board (tabs: All/Table/Room/Home, action buttons matching §9.2 transitions), menu management (CRUD + one-click **Mark Out of Stock** toggle on every item), table/room management (CRUD + QR generate/download/print), reports (§13), settings (§11).

### 10.3 Kitchen view
Read-scoped to `new`/`accepted`/`preparing` orders for the restaurant. Only exposes the "Start Preparing" / "Mark Ready" actions — no access to menu pricing or restaurant settings (enforce via role check in §12, not just UI hiding).

### 10.4 New-order notification
On new order: Realtime-driven UI update (mandatory, not optional) + notification sound + visual badge + browser notification if permission granted. The dashboard's visible order list is the source of truth; the browser notification is a convenience layer only — never rely on it alone.

---

## 11. Business Rules (canonical — supersedes any scattered mention elsewhere)

- **Out of stock:** `menu_items.is_available = false` hides the item from *new* bucket additions and shows "Currently unavailable" in the UI, but does not affect existing orders already placed.
- **Business hours:** if `now()` is outside `[opening_time, closing_time]` in the restaurant's `timezone`, and `manual_override` is not `'open'`, reject new orders with "Online ordering is currently closed. Opens at {opening_time}." `manual_override = 'closed'` forces closed regardless of the clock.
- **Home delivery minimums:** reject checkout below `restaurant_settings.min_home_order_amount` with a clear message showing the shortfall.
- **Duplicate submission:** handled entirely by idempotency key (§9.4) — never by disabling the button alone (client-side disabling is a UX nicety, not the safeguard).
- **Menu item deleted after order placed:** `order_items.menu_item_id` is nullable specifically so historical orders survive menu item deletion; never cascade-delete order history when a menu item is removed.
- **Price changes:** never retroactively affect existing `order_items` (Agent Rule #3).
- **Network/API errors:** never fail silently — every mutating action shows an explicit error state with retry guidance (see error copy examples below, reusable verbatim).

| Situation | User-facing message |
|---|---|
| Item unavailable | "Sorry, this item is currently unavailable." |
| QR session expired | "Your ordering session has expired. Please scan the QR again or verify your mobile number." |
| Restaurant closed | "Online ordering is currently closed." |
| Network failure | "Connection lost. Please check your internet connection." |

---

## 12. Authentication & Authorization

**Staff:** Supabase Auth (email/password or magic link). Role stored in `user_profiles.role` ∈ `{owner, manager, kitchen, staff}`. Never trust a role claimed by the client — every server action re-checks `user_profiles.role` for the authenticated `auth.uid()`.

| Action | owner | manager | kitchen | staff |
|---|---|---|---|---|
| View live orders | ✓ | ✓ | ✓ | ✓ |
| Change order status | ✓ | ✓ | ✓ (kitchen-relevant transitions only) | ✓ |
| Edit menu/prices | ✓ | ✓ | ✗ | ✗ |
| Manage tables/rooms/QR | ✓ | ✓ | ✗ | ✗ |
| Manage staff accounts | ✓ | ✗ | ✗ | ✗ |
| View reports | ✓ | ✓ | ✗ | ✗ |
| Edit restaurant settings | ✓ | ✗ | ✗ | ✗ |

**Customers (home):** phone + OTP via Supabase Auth, no password. `customers` row is linked via `auth_user_id`. Table/room customers remain anonymous unless their QR session expires and they choose name+mobile verification (§7) — that path does **not** require full OTP unless you choose to require it; state your choice explicitly in the phase-3/phase-8 implementation rather than leaving it ambiguous.

---

## 13. Non-Functional Requirements

**Mobile/PWA:** large touch targets, sticky bucket bar, lazy-loaded images, minimal animation, no unnecessary modals, no horizontal scroll, installable PWA with app icon/splash screen, offline fallback for browsing only. **Orders must never be submitted while offline** — the place-order action must hard-fail with the network-error message (§11) rather than queue silently.

**Performance target:** usable on mobid 4G; menu route should be interactive within ~2s on a mid-range Android device.

**Storage:** Supabase Storage buckets `restaurant-assets` (logos) and `menu-images` (item photos), images optimized/resized before upload.

**Payments:** abstracted behind a `PaymentService` interface (`createPayment()`, `verifyPayment()`, `refundPayment()`) so a gateway (Razorpay/Cashfree/PhonePe) can be plugged in post-MVP without touching order logic. MVP payment methods are `cash`, `upi_manual`, `room_bill` only — no live gateway integration in MVP. If a gateway is added later, **payment verification must happen server-side via the provider's webhook**, never trusted from a client-side "success" callback alone.

**Reports (MVP):** today's sales/orders/channel breakdown, filterable by Today/Yesterday/Last 7 days/Last 30 days/Custom range. Best-sellers, revenue-by-channel, and peak-time analytics are Phase 2.

---

## 14. Development Phases & Acceptance Criteria

Build strictly in this order. Each phase lists what to build and the exact bar for "done." Do not start phase *n+1* until every box in phase *n* is checked.

**Phase 1 — Foundation**
Next.js + TS + Tailwind + shadcn + Supabase client + env var validation + base layouts + ESLint + type-check.
✅ `npm run dev` and production build both succeed with zero type errors.

**Phase 2 — Database**
All tables in §5, with constraints/indexes/FKs, plus RLS policies from §6, plus seed data (one demo restaurant, a few tables/rooms/menu items).
✅ Every table has RLS enabled; a seeded anonymous request can read the menu but not write an order directly.

**Phase 3 — Staff auth & roles**
Login/logout/session; role checks per §12 table enforced server-side (not just hidden nav items).
✅ A `kitchen`-role user attempting to hit `/api/admin/menu` (edit) gets `403`.

**Phase 4 — Menu management**
Admin CRUD for categories/items/addons/availability; customer-facing menu read (§8 `GET /api/menu`).
✅ Manager changes a price → customer's next menu fetch reflects it immediately; existing `order_items` from before the change are untouched.

**Phase 5 — QR system**
Table/room CRUD, QR token generation, `POST /api/qr/session`, 5-minute expiry per §7.
✅ Scanning Table 12's QR resolves to Table 12's menu; scanning after >5 minutes and pressing "Place Order" triggers the expired-session flow, not a silent failure.

**Phase 6 — Bucket**
Client-side add/remove/qty/notes, subtotal calculation, persisted client-side (in-memory/local state — **not** a database write) until checkout.
✅ Bucket survives a QR re-scan and a session-expiry verification flow without clearing.

**Phase 7 — Order creation**
Implement the full algorithm in §9, including idempotency and the state machine in §9.2.
✅ Double-tapping "Place Order" produces exactly one order row. A crafted request with a manipulated `unit_price` in the body is ignored server-side; the stored price matches the database, not the request.

**Phase 8 — Session-expiry verification**
Name+mobile (and OTP hookup point) flow per §7; bucket preserved throughout.
✅ Expired session → verify → order succeeds → bucket was never lost at any step.

**Phase 9 — Manager dashboard**
Live order board with §9.2-compliant status actions, connected to Supabase Realtime.
✅ An order created in another tab appears on the dashboard with no manual refresh, within a couple seconds.

**Phase 10 — Kitchen view**
Read/action-scoped subset per §10.3, role-gated per §12.
✅ Kitchen-role user cannot reach menu-price or settings routes even via direct URL.

**Phase 11 — Home delivery**
Home mode, customer OTP, profile, addresses, checkout, delivery fee, `out_for_delivery`/`delivered` statuses.
✅ A signed-out visitor can browse the full menu; placing an order requires OTP verification before `POST /api/orders` succeeds.

**Phase 12 — Payment abstraction**
`PaymentService` interface per §13; MVP methods only (no live gateway).
✅ Switching `payment_method` doesn't touch order-creation logic outside the payment step.

**Phase 13 — QR printing**
Printable table/room QR pages, PNG/PDF export.
✅ Generated PDF scans correctly to the right table/room on a real phone camera.

**Phase 14 — Reports**
MVP reports per §13.
✅ Numbers reconcile against a manual count of seeded/test orders for a given date range.

**Phase 15 — Security audit** (pre-production gate)
Explicitly re-test: RLS on every table, authn/authz boundaries, QR token guessing/manipulation, expired-session bypass attempts, duplicate-order attempts, price-manipulation attempts (§9.1 table), order-ID enumeration across tenants, cross-restaurant data access, admin-route access without the right role, basic API abuse (rate limiting on OTP send in particular).
✅ Every item above has a corresponding automated test, not just a manual click-through.

---

## 15. Testing Strategy

- **Unit:** price/tax/delivery-fee calculation (§9), QR expiry logic (§7), order-status transition validation (§9.2), input validation (Zod schemas for every API contract in §8).
- **Integration:** full chain QR → session → menu → order for both a happy path and each error case in §8.
- **E2E (Playwright):** (a) scan table QR → add item → checkout → order created → manager accepts → customer sees status update in real time; (b) session expires mid-checkout → re-verify → bucket intact → order still succeeds.

---

## 16. Project Structure

```
app/
├── (customer)/{menu,cart,checkout,order,account}/
├── (admin)/{dashboard,orders,menu,tables,rooms,customers,settings}/
├── api/{qr,orders,menu,customer,admin}/
├── login/
└── page.tsx
components/{customer,admin,menu,cart,orders,ui}/
lib/{supabase,auth,qr,orders,pricing,validation}/
supabase/{migrations,seed.sql,functions}/
types/
```

---

## 17. Deployment

Frontend → Vercel. Database/Auth/Realtime/Storage → Supabase. DNS → Cloudflare (e.g. `menu.yourhotel.com`).

**Environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server-only, never exposed to the browser
NEXT_PUBLIC_SITE_URL
PAYMENT_SECRET_KEY             # server-only
PAYMENT_WEBHOOK_SECRET         # server-only
```

**CI/CD:** GitHub → PR → build/test → Vercel → production. One commit per feature, conventional-commit style (`feat: add qr session system`, `fix: prevent duplicate order submission`).

---

## 18. How to Prompt the Agent (recommended sequence)

Do not paste this whole document and say "build everything." Drive it phase by phase:

1. *"Read the PRD in full. Do not write code yet. Summarize your understanding of §9 (order creation) and §6 (RLS) in your own words, and flag any ambiguity before we start."*
2. *"Implement Phase 1 only (§14). Stop after the acceptance criteria are met and report status against the checklist."*
3. *"Implement Phase 2 only. Use the exact DDL in §5. Report the RLS policies you created against the matrix in §6."*
4. Continue phase by phase, always referencing the phase's acceptance criteria explicitly in the prompt.

This produces materially more reliable output than a single "build the whole app" prompt, because each phase has a checkable, falsifiable definition of done instead of an open-ended goal.

---

## 19. Final Architecture

```
                          CUSTOMER
                             │
             ┌───────────────┼───────────────┐
           TABLE            ROOM            HOME
             │ QR             │ QR             │ Website
             └───────────────┼───────────────┘
                             ▼
                        NEXT.JS APP
                             │
              ┌──────────────┼──────────────┐
             MENU           BUCKET         ACCOUNT
              └──────────────┼──────────────┘
                             ▼
                         CHECKOUT
                    ┌────────┴────────┐
              QR Session         Customer
              Validation (§7)    Verification (§7/§12)
                    └────────┬────────┘
                             ▼
                    ORDER (§9 algorithm)
                             │
                         SUPABASE
              ┌──────────────┼──────────────┐
           MANAGER        KITCHEN        CUSTOMER
          DASHBOARD         VIEW         TRACKING
```

This architecture supports later additions — waiter calls, room billing, live payment gateways, kitchen display screens, WhatsApp notifications, loyalty, multi-branch, full POS — without restructuring the core ordering flow, because order context and customer identity were kept separate from the start (§2).