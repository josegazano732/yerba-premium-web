-- ============================================================================
-- Mate Tierra — Pedidos, pagos e inventario (integración Mercado Pago).
-- Ejecutar una sola vez en el SQL Editor de Supabase o vía `supabase db push`.
--
-- Crea:
--   * orders                → pedido (cabecera) con estados de pedido y de pago.
--   * order_items           → detalle histórico del pedido (precio congelado).
--   * inventory_movements   → registro de movimientos de stock.
--   * payment_webhook_events→ auditoría de notificaciones recibidas.
--   * process_payment_event → RPC idempotente que confirma pagos y descuenta stock.
--
-- Seguridad: RLS habilitado en todas las tablas nuevas y SIN políticas para
-- anon/authenticated. Todo el acceso se hace desde Route Handlers con la
-- service role key (que ignora RLS). El navegador nunca toca estas tablas.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Pedido (cabecera)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address text not null,
  shipping_city text not null,
  shipping_province text not null,
  shipping_postal_code text not null,
  subtotal numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','shipped','delivered','cancelled')),
  payment_provider text not null default 'mercadopago',
  payment_status text not null default 'pending'
    check (payment_status in ('pending','approved','rejected','in_process','cancelled','refunded')),
  payment_id text,
  payment_external_reference text,
  mercadopago_preference_id text,
  shipping_label text,
  shipping_eta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un pago solo puede pertenecer a un pedido (idempotencia de pagos).
  constraint orders_payment_id_unique unique (payment_id)
);

-- ----------------------------------------------------------------------------
-- 2. Detalle del pedido (fotografía histórica de lo comprado)
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  product_slug text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);

-- ----------------------------------------------------------------------------
-- 3. Movimientos de inventario
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('SALE','RESTOCK','ADJUSTMENT','CANCELLATION')),
  quantity integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_product_id on public.inventory_movements (product_id);
create index if not exists idx_inventory_movements_order_id on public.inventory_movements (order_id);

-- ----------------------------------------------------------------------------
-- 4. Auditoría de webhooks (evento por notificación recibida)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  event_type text,
  action text,
  payment_id text,
  order_id uuid references public.orders(id) on delete set null,
  payment_status text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_payment_webhook_events_event_id
  on public.payment_webhook_events (event_id)
  where event_id is not null;

-- ----------------------------------------------------------------------------
-- 5. updated_at automático para orders
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. RPC idempotente para procesar el evento de pago
--    · Bloquea la fila del pedido (FOR UPDATE) para serializar webhooks.
--    · No reprocesa si el pedido ya fue confirmado.
--    · Descuenta stock y registra movimientos SOLO en `approved` + `confirmed`.
-- ----------------------------------------------------------------------------
create or replace function public.process_payment_event(
  p_order_id uuid,
  p_payment_id text,
  p_payment_status text,
  p_order_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- Idempotencia dura: un pedido ya confirmado no se vuelve a procesar.
  if v_order.status = 'confirmed' then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  -- Mismo pago + mismo estado: no hay nada que hacer.
  if v_order.payment_id is not null
     and v_order.payment_id = p_payment_id
     and v_order.payment_status = p_payment_status
     and v_order.status = p_order_status then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;

  update public.orders
     set payment_id = p_payment_id,
         payment_status = p_payment_status,
         status = p_order_status
   where id = p_order_id;

  -- Solo una venta aprobada descuenta stock.
  if p_payment_status = 'approved' and p_order_status = 'confirmed' then
    insert into public.inventory_movements (product_id, order_id, type, quantity)
    select oi.product_id, oi.order_id, 'SALE', -oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id;

    update public.products p
       set stock = p.stock - oi.total_qty
      from (
        select product_id, sum(quantity) as total_qty
          from public.order_items
         where order_id = p_order_id
         group by product_id
      ) oi
     where p.id::text = oi.product_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. RLS: habilitado y sin políticas (acceso exclusivo vía service role)
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.payment_webhook_events enable row level security;
