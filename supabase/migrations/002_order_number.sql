-- ============================================================
-- 002_order_number.sql
-- Order-number generation per PRD §5 note: lock the max for the
-- restaurant inside the same transaction to avoid races.
-- ============================================================

create or replace function fn_next_order_number(p_restaurant_id uuid) returns integer as $$
declare
  next_num integer;
begin
  -- Advisory lock keyed by restaurant_id hash so concurrent inserts
  -- for the same restaurant serialise through this critical section.
  perform pg_advisory_xact_lock(hashtext(p_restaurant_id::text));

  select coalesce(max(order_number), 1000) + 1
    into next_num
    from orders
   where restaurant_id = p_restaurant_id;

  return next_num;
end;
$$ language plpgsql;

-- before-insert trigger on orders calls fn_next_order_number so callers
-- can `insert into orders (..., order_number) values (..., default)`
-- without computing it themselves. The trigger ignores client-supplied
-- values to keep numbering authoritative.
create or replace function trg_orders_set_order_number() returns trigger as $$
begin
  new.order_number := fn_next_order_number(new.restaurant_id);
  return new;
end;
$$ language plpgsql;

create trigger set_order_number_orders
  before insert on orders
  for each row execute function trg_orders_set_order_number();