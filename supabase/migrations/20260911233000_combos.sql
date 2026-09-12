-- ============================================================================
-- Mate Tierra — Combos.
--
-- Crea:
--   * combos               → combo (cabecera) con precio especial y vigencia.
--   * combo_items          → composición del combo (producto + cantidad).
--   * order_combos         → fotografía histórica del combo vendido.
--   * order_combo_items    → fotografía histórica de los componentes vendidos.
--
-- Reutiliza:
--   * products / orders / order_items / inventory_movements existentes.
--   * site_settings para la visibilidad global de la sección (combos_enabled).
--
-- El stock se descuenta por componente en `process_payment_event`, que se
-- redefine al final de este archivo para sumar los componentes de los combos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Combos
-- ----------------------------------------------------------------------------
create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image text,
  price numeric(12,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_combos_active_sort
  on public.combos (active, sort_order, name);

create or replace function public.set_updated_at_combos()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_combos_updated_at on public.combos;
create trigger trg_combos_updated_at
  before update on public.combos
  for each row
  execute function public.set_updated_at_combos();

-- ----------------------------------------------------------------------------
-- 2. Composición del combo
--    product_id es text para alinearse con order_items.product_id (uuid::text).
-- ----------------------------------------------------------------------------
create table if not exists public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint combo_items_combo_product_unique unique (combo_id, product_id)
);

create index if not exists idx_combo_items_combo_id on public.combo_items (combo_id);
create index if not exists idx_combo_items_product_id on public.combo_items (product_id);

-- ----------------------------------------------------------------------------
-- 3. Fotografía histórica del combo vendido (cabecera)
-- ----------------------------------------------------------------------------
create table if not exists public.order_combos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  combo_id uuid,
  combo_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_combos_order_id on public.order_combos (order_id);
create index if not exists idx_order_combos_combo_id on public.order_combos (combo_id);

-- ----------------------------------------------------------------------------
-- 4. Fotografía histórica de los componentes del combo vendido
-- ----------------------------------------------------------------------------
create table if not exists public.order_combo_items (
  id uuid primary key default gen_random_uuid(),
  order_combo_id uuid not null references public.order_combos(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_combo_items_order_combo_id
  on public.order_combo_items (order_combo_id);
create index if not exists idx_order_combo_items_product_id
  on public.order_combo_items (product_id);

-- ----------------------------------------------------------------------------
-- 5. RLS
--    combos / combo_items: lectura pública + escritura autenticada (panel).
--    order_combos / order_combo_items: igual que orders (solo service role).
-- ----------------------------------------------------------------------------
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
alter table public.order_combos enable row level security;
alter table public.order_combo_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'combos'
      and policyname = 'combos_read_all'
  ) then
    create policy combos_read_all
      on public.combos for select using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'combos'
      and policyname = 'combos_write_authenticated'
  ) then
    create policy combos_write_authenticated
      on public.combos for all to authenticated
      using (true) with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'combo_items'
      and policyname = 'combo_items_read_all'
  ) then
    create policy combo_items_read_all
      on public.combo_items for select using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'combo_items'
      and policyname = 'combo_items_write_authenticated'
  ) then
    create policy combo_items_write_authenticated
      on public.combo_items for all to authenticated
      using (true) with check (true);
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 6. Visibilidad global de la sección (configurable desde el panel).
--
--    `site_settings` se define normalmente en 20260906203000_ai_system_prompt.sql.
--    Para que esta migración sea autocontenida (y no falle si aquella aún no se
--    aplicó), se crea aquí de forma idempotente junto con sus políticas RLS.
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  "key" text primary key,
  "value" text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_settings_key
  on public.site_settings ("key");

alter table public.site_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'site_settings_read_all'
  ) then
    create policy site_settings_read_all
      on public.site_settings
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_settings'
      and policyname = 'site_settings_write_authenticated'
  ) then
    create policy site_settings_write_authenticated
      on public.site_settings
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

insert into public.site_settings ("key", "value")
values ('combos_enabled', 'true')
on conflict ("key") do nothing;

-- ----------------------------------------------------------------------------
-- 7. RPC de pago (redefinido) — ahora también descuenta el stock de los
--    componentes de los combos y registra sus movimientos de inventario.
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
    -- Productos vendidos como items individuales.
    insert into public.inventory_movements (product_id, order_id, type, quantity)
    select oi.product_id, oi.order_id, 'SALE', -oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id;

    -- Productos vendidos dentro de combos.
    insert into public.inventory_movements (product_id, order_id, type, quantity)
    select oci.product_id, oc.order_id, 'SALE', -oci.quantity
      from public.order_combos oc
      join public.order_combo_items oci on oci.order_combo_id = oc.id
     where oc.order_id = p_order_id;

    update public.products p
       set stock = p.stock - oi.total_qty
      from (
        select product_id, sum(quantity) as total_qty
          from public.order_items
         where order_id = p_order_id
         group by product_id
      ) oi
     where p.id::text = oi.product_id;

    update public.products p
       set stock = p.stock - cc.total_qty
      from (
        select oci.product_id, sum(oci.quantity) as total_qty
          from public.order_combos oc
          join public.order_combo_items oci on oci.order_combo_id = oc.id
         where oc.order_id = p_order_id
         group by oci.product_id
      ) cc
     where p.id::text = cc.product_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
