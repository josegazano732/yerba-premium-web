-- Parametros de margen sugerido por tipo de cliente mayorista.
create table if not exists public.wholesale_margin_profiles (
  id uuid primary key default gen_random_uuid(),
  use_key text not null unique,
  use_label text not null,
  suggested_margin_percentage numeric(5,2) not null,
  is_active boolean not null default true,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_margin_profiles_margin_range_check
    check (suggested_margin_percentage >= 1 and suggested_margin_percentage <= 90)
);

create index if not exists idx_wholesale_margin_profiles_active_order
  on public.wholesale_margin_profiles (is_active, display_order, use_label);

create or replace function public.set_updated_at_wholesale_margin_profiles()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wholesale_margin_profiles_updated_at on public.wholesale_margin_profiles;
create trigger trg_wholesale_margin_profiles_updated_at
before update on public.wholesale_margin_profiles
for each row
execute function public.set_updated_at_wholesale_margin_profiles();

alter table public.wholesale_margin_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wholesale_margin_profiles'
      and policyname = 'wholesale_margin_profiles_read_all'
  ) then
    create policy wholesale_margin_profiles_read_all
      on public.wholesale_margin_profiles
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
      and tablename = 'wholesale_margin_profiles'
      and policyname = 'wholesale_margin_profiles_write_authenticated'
  ) then
    create policy wholesale_margin_profiles_write_authenticated
      on public.wholesale_margin_profiles
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

insert into public.wholesale_margin_profiles (use_key, use_label, suggested_margin_percentage, is_active, display_order)
values
  ('grandes-cadenas', 'Grandes cadenas', 20, true, 1),
  ('supermercado', 'Supermercado', 25, true, 2),
  ('comercio-especializado', 'Comercio especializado', 30, true, 3),
  ('dietetica-premium', 'Dietetica / premium', 35, true, 4),
  ('productos-diferenciales', 'Productos diferenciales', 40, true, 5)
on conflict (use_key) do update
set
  use_label = excluded.use_label,
  suggested_margin_percentage = excluded.suggested_margin_percentage,
  is_active = excluded.is_active,
  display_order = excluded.display_order;
