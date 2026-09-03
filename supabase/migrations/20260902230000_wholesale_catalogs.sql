-- Catalogos mayoristas administrables desde /admin/productos.
create table if not exists public.wholesale_catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_name text not null,
  description text not null default '',
  hero_image_url text,
  suggested_margin_percentage numeric(5,2) not null default 30,
  is_active boolean not null default true,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_catalogs_margin_range_check
    check (suggested_margin_percentage >= 1 and suggested_margin_percentage <= 90)
);

create index if not exists idx_wholesale_catalogs_active_order
  on public.wholesale_catalogs (is_active, display_order, title);

create or replace function public.set_updated_at_wholesale_catalogs()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wholesale_catalogs_updated_at on public.wholesale_catalogs;
create trigger trg_wholesale_catalogs_updated_at
before update on public.wholesale_catalogs
for each row
execute function public.set_updated_at_wholesale_catalogs();

alter table public.wholesale_catalogs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wholesale_catalogs'
      and policyname = 'wholesale_catalogs_read_all'
  ) then
    create policy wholesale_catalogs_read_all
      on public.wholesale_catalogs
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
      and tablename = 'wholesale_catalogs'
      and policyname = 'wholesale_catalogs_write_authenticated'
  ) then
    create policy wholesale_catalogs_write_authenticated
      on public.wholesale_catalogs
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

insert into public.wholesale_catalogs (
  slug,
  title,
  category_name,
  description,
  suggested_margin_percentage,
  is_active,
  display_order
)
values (
  'hierbas',
  'Catalogo de Hierbas',
  'Hierbas',
  'Hierbas serranas, aromaticas y secos fraccionados para revendedores y dieteticas.',
  30,
  true,
  1
)
on conflict (slug) do nothing;
