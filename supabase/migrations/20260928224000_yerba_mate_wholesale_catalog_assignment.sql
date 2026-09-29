alter table public.products
  add column if not exists wholesale_catalog_id uuid
  references public.wholesale_catalogs(id)
  on delete set null;

create index if not exists idx_products_wholesale_catalog_id
  on public.products (wholesale_catalog_id)
  where wholesale_catalog_id is not null;
