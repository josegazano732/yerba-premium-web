-- Configuracion global del sitio (clave/valor) editable desde el panel de administracion.
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
