-- Subcategorías administrables vinculadas a una categoría principal.
create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  display_order integer not null default 1 check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_subcategories_name_not_blank check (btrim(name) <> ''),
  constraint product_subcategories_slug_not_blank check (btrim(slug) <> ''),
  constraint product_subcategories_category_slug_key unique (category_id, slug),
  constraint product_subcategories_category_id_id_key unique (category_id, id)
);

alter table public.product_subcategories enable row level security;

drop policy if exists "Public can read active product subcategories" on public.product_subcategories;
create policy "Public can read active product subcategories"
  on public.product_subcategories
  for select
  using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage product subcategories" on public.product_subcategories;
create policy "Authenticated users can manage product subcategories"
  on public.product_subcategories
  for all
  to authenticated
  using (true)
  with check (true);

-- Los productos existentes reciben una subcategoría General dentro de su categoría.
insert into public.product_subcategories (category_id, name, slug, display_order)
select distinct products.category_id, 'General', 'general', 1
from public.products
where products.category_id is not null
on conflict (category_id, slug) do nothing;

alter table public.products
  add column if not exists subcategory_id uuid;

update public.products
set subcategory_id = product_subcategories.id
from public.product_subcategories
where products.subcategory_id is null
  and product_subcategories.category_id = products.category_id
  and product_subcategories.slug = 'general';

alter table public.products
  alter column subcategory_id set not null;

alter table public.products
  drop constraint if exists products_subcategory_id_fkey;

alter table public.products
  add constraint products_subcategory_id_fkey
  foreign key (subcategory_id)
  references public.product_subcategories(id)
  on delete restrict;

alter table public.products
  drop constraint if exists products_category_subcategory_fkey;

alter table public.products
  add constraint products_category_subcategory_fkey
  foreign key (category_id, subcategory_id)
  references public.product_subcategories(category_id, id)
  on delete restrict;

create index if not exists idx_product_subcategories_category_order
  on public.product_subcategories (category_id, is_active, display_order);

create index if not exists idx_products_subcategory_id
  on public.products (subcategory_id);

-- Catálogo inicial de subcategorías definido para los productos actuales.
with subcategory_seed (category_name, subcategory_name, slug) as (
  values
    ('Accesorios', 'Confort matero', 'confort-matero'),
    ('Accesorios', 'Bases para mate', 'bases-para-mate'),
    ('Accesorios', 'Bombilleros', 'bombilleros'),
    ('Accesorios', 'Iluminación', 'iluminacion'),
    ('Accesorios', 'Portamates', 'portamates'),
    ('Accesorios', 'Tapas para mate', 'tapas-para-mate'),
    ('Accesorios', 'Tapones cebadores', 'tapones-cebadores'),
    ('Alimentos Secos', 'Especias', 'especias'),
    ('Alimentos Secos', 'Repostería', 'reposteria'),
    ('Bombillas', 'Acero', 'acero'),
    ('Bombillas', 'Alpaca', 'alpaca'),
    ('Bombillas', 'Bombillones de alpaca', 'bombillones-de-alpaca'),
    ('Calcomanías/Stickers', 'Calcomanías', 'calcomanias'),
    ('Hierbas', 'Complementos naturales', 'complementos-naturales'),
    ('Hierbas', 'Endulzantes naturales', 'endulzantes-naturales'),
    ('Hierbas', 'Especias', 'especias'),
    ('Hierbas', 'Flores', 'flores'),
    ('Hierbas', 'Frutas deshidratadas', 'frutas-deshidratadas'),
    ('Hierbas', 'Hierbas para infusión', 'hierbas-para-infusion'),
    ('Hierbas', 'Hierbas para mate', 'hierbas-para-mate'),
    ('Hierbas', 'Mezclas herbales', 'mezclas-herbales'),
    ('Hierbas', 'Mezclas para mate', 'mezclas-para-mate'),
    ('Hierbas', 'Tés', 'tes'),
    ('Materas', 'Canastas', 'canastas'),
    ('Materas', 'Mochilas', 'mochilas'),
    ('Materas', 'Morrales', 'morrales'),
    ('Mates', 'Acero', 'acero'),
    ('Mates', 'Algarrobo', 'algarrobo'),
    ('Mates', 'Camionero', 'camionero'),
    ('Mates', 'Galleta', 'galleta'),
    ('Mates', 'Imperial', 'imperial'),
    ('Mates', 'Pampa', 'pampa'),
    ('Mates', 'Rústicos', 'rusticos'),
    ('Mates', 'Torpedo', 'torpedo'),
    ('Pequeños', 'Botellas infantiles', 'botellas-infantiles'),
    ('Pequeños', 'Loncheras', 'loncheras'),
    ('Térmico', 'Botellas térmicas', 'botellas-termicas'),
    ('Térmico', 'Mates autocebantes', 'mates-autocebantes'),
    ('Térmico', 'Termolares', 'termolares'),
    ('Térmico', 'Vasos térmicos', 'vasos-termicos'),
    ('Termos', 'Acero inoxidable', 'acero-inoxidable'),
    ('Termos', 'Mates autocebantes', 'mates-autocebantes'),
    ('Termos', 'Media manija', 'media-manija'),
    ('Yerberas', 'Gamuza', 'gamuza'),
    ('Yerberas', 'Tela', 'tela')
),
resolved_subcategories as (
  select
    product_categories.id as category_id,
    subcategory_seed.subcategory_name,
    subcategory_seed.slug,
    row_number() over (
      partition by product_categories.id
      order by subcategory_seed.subcategory_name
    ) as display_order
  from subcategory_seed
  join public.product_categories
    on product_categories.name = subcategory_seed.category_name
)
insert into public.product_subcategories (
  category_id,
  name,
  slug,
  is_active,
  display_order
)
select
  category_id,
  subcategory_name,
  slug,
  true,
  display_order
from resolved_subcategories
on conflict (category_id, slug) do update
set
  name = excluded.name,
  is_active = true,
  display_order = excluded.display_order,
  updated_at = now();

-- Asignación individual de los productos a las subcategorías anteriores.
with product_assignment (product_name, category_name, subcategory_name) as (
  values
    ('ALMOHADA MATERA', 'Accesorios', 'Confort matero'),
    ('BASE PARA MATE (cuero y alambre)', 'Accesorios', 'Bases para mate'),
    ('BOMBILLERO DE GAMUZA', 'Accesorios', 'Bombilleros'),
    ('LUZ MATE', 'Accesorios', 'Iluminación'),
    ('PORTAMATE CUERO', 'Accesorios', 'Portamates'),
    ('PORTAMATE TELA', 'Accesorios', 'Portamates'),
    ('TAPA MATE SILICONA', 'Accesorios', 'Tapas para mate'),
    ('TAPON CEBADOR STANLEY', 'Accesorios', 'Tapones cebadores'),
    ('Canela X KG', 'Alimentos Secos', 'Especias'),
    ('Coco rallado X KG', 'Alimentos Secos', 'Repostería'),
    ('Eneldo X KG', 'Alimentos Secos', 'Especias'),
    ('Jengibre (polvo) x KG', 'Alimentos Secos', 'Especias'),
    ('ACERO CHATA', 'Bombillas', 'Acero'),
    ('ACERO CHATA FILTRO LUNA', 'Bombillas', 'Acero'),
    ('ACERO CURVA', 'Bombillas', 'Acero'),
    ('ACERO PICO LORO', 'Bombillas', 'Acero'),
    ('ALPACA BOMBILLON URUGUAYO', 'Bombillas', 'Bombillones de alpaca'),
    ('ALPACA EXTRA CURVA', 'Bombillas', 'Alpaca'),
    ('ALPACA PICO DE LORO', 'Bombillas', 'Alpaca'),
    ('ALPACA TOTALMENTE DESARMABLE URUGUAYA', 'Bombillas', 'Alpaca'),
    ('ALPACA URUGUAYA REY', 'Bombillas', 'Alpaca'),
    ('BOMBILLON ALPACA', 'Bombillas', 'Bombillones de alpaca'),
    ('BOMBILLON ALPACA PICO EXTRA GRUESO', 'Bombillas', 'Bombillones de alpaca'),
    ('BOMBILLON ALPACA PREMIUM', 'Bombillas', 'Bombillones de alpaca'),
    ('Stickers - Calcomanías', 'Calcomanías/Stickers', 'Calcomanías'),
    ('Anis estrellado', 'Hierbas', 'Especias'),
    ('Azafran', 'Hierbas', 'Especias'),
    ('Bandeja Herbal Natural HIBISCUS', 'Hierbas', 'Flores'),
    ('Bicarbonato', 'Hierbas', 'Complementos naturales'),
    ('Boldo', 'Hierbas', 'Hierbas para infusión'),
    ('Burrito', 'Hierbas', 'Hierbas para mate'),
    ('Calendula', 'Hierbas', 'Flores'),
    ('Cedron', 'Hierbas', 'Hierbas para infusión'),
    ('Clavo de Olor', 'Hierbas', 'Especias'),
    ('Coco en escama', 'Hierbas', 'Frutas deshidratadas'),
    ('Cola de Caballo', 'Hierbas', 'Hierbas para infusión'),
    ('Cúrcuma', 'Hierbas', 'Especias'),
    ('Eucalipto', 'Hierbas', 'Hierbas para infusión'),
    ('Flor de Jamaica (Hibiscus)', 'Hierbas', 'Flores'),
    ('Lavanda', 'Hierbas', 'Flores'),
    ('Malva', 'Hierbas', 'Hierbas para infusión'),
    ('Manzanilla', 'Hierbas', 'Flores'),
    ('Marcela', 'Hierbas', 'Hierbas para infusión'),
    ('Menta', 'Hierbas', 'Hierbas para mate'),
    ('Mix FLORAL', 'Hierbas', 'Mezclas herbales'),
    ('Mix MATE', 'Hierbas', 'Mezclas para mate'),
    ('Mix MATE/FLORAL (zipper)', 'Hierbas', 'Mezclas para mate'),
    ('Moringa', 'Hierbas', 'Hierbas para infusión'),
    ('Naranja deshidratada', 'Hierbas', 'Frutas deshidratadas'),
    ('Ruleta Mix de Sabores Naturales', 'Hierbas', 'Mezclas para mate'),
    ('Siempre Viva', 'Hierbas', 'Flores'),
    ('Siempre Viva En Caja Corazón', 'Hierbas', 'Flores'),
    ('Stevia', 'Hierbas', 'Endulzantes naturales'),
    ('Te Rojo', 'Hierbas', 'Tés'),
    ('Te Verde', 'Hierbas', 'Tés'),
    ('Tilo', 'Hierbas', 'Hierbas para infusión'),
    ('CANASTA CUADRADA DE CUERO', 'Materas', 'Canastas'),
    ('CANASTA OVALADA CUERO', 'Materas', 'Canastas'),
    ('MOCHILA CAY', 'Materas', 'Mochilas'),
    ('MOCHILA CAY N', 'Materas', 'Mochilas'),
    ('MOCHILA CUERO', 'Materas', 'Mochilas'),
    ('MOCHILA MOD', 'Materas', 'Mochilas'),
    ('MORRAL BOLSO', 'Materas', 'Morrales'),
    ('MORRAL CAY', 'Materas', 'Morrales'),
    ('MORRAL TRIANGULAR', 'Materas', 'Morrales'),
    ('ACERO TERMICO', 'Mates', 'Acero'),
    ('AERO ACERO 304 IN BOX (NEGRO)', 'Mates', 'Acero'),
    ('AERO ACERO 304 IN BOX (ROSADO)', 'Mates', 'Acero'),
    ('AERO ACERO 304 IN BOX - (VERDE)', 'Mates', 'Acero'),
    ('ALGARROBO CON BASE', 'Mates', 'Algarrobo'),
    ('ALGARROBO FORRADO EN CUERO', 'Mates', 'Algarrobo'),
    ('CAMIONERO ALGARROBO', 'Mates', 'Camionero'),
    ('CAMIONERO LAPACHO', 'Mates', 'Camionero'),
    ('CAMIONERO LAPACHO c/ grabado', 'Mates', 'Camionero'),
    ('CAMIONERO VIROLA ALPACA CINCELADA', 'Mates', 'Camionero'),
    ('CAMIONERO VIROLA ALPACA LISA', 'Mates', 'Camionero'),
    ('CAMIONERO VIROLA DE ACERO LISO', 'Mates', 'Camionero'),
    ('CAMIONERO VIROLA DE ALUMINIO', 'Mates', 'Camionero'),
    ('CRIOLLO TORPEDO', 'Mates', 'Torpedo'),
    ('CUERO CRUDO TORPEDO', 'Mates', 'Torpedo'),
    ('GALLETA', 'Mates', 'Galleta'),
    ('IMPERIAL ALGARROBO', 'Mates', 'Imperial'),
    ('IMPERIAL CRIOLLO', 'Mates', 'Imperial'),
    ('IMPERIAL CUERO CRUDO', 'Mates', 'Imperial'),
    ('IMPERIAL LAPACHO', 'Mates', 'Imperial'),
    ('IMPERIAL RUSTICO', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA ACERO BASE DE CUERO', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA ALPACA ANIMAL PRINT', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA ALPACA ARGENTINA', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA ALPACA CINCELADA', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA ALPACA LISA', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA DE ALPACA BASE ALPACA CERRADA', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA DE ALPACA CINCELADA CON BASE ALPACA', 'Mates', 'Imperial'),
    ('IMPERIAL VIROLA DE ALPACA LISA CON BASE ALPACA', 'Mates', 'Imperial'),
    ('MATE PAMPA + BOMBILLA DE ACERO', 'Mates', 'Pampa'),
    ('RUSTICO CAMIONERO VIROLA ALPACA CINCELADO', 'Mates', 'Rústicos'),
    ('RUSTICO CON BASE DE CUERO', 'Mates', 'Rústicos'),
    ('RUSTICO TOPEDO', 'Mates', 'Rústicos'),
    ('TORPEDO ALGARROBO', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ACERO', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ALPACA CINCELADA', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ALPACA CINCELADA BASE DE ALPACA', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ALPACA LISA', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ALPACA LISA BASE DE ALPACA', 'Mates', 'Torpedo'),
    ('TORPEDO VIROLA DE ALUMINIO', 'Mates', 'Torpedo'),
    ('Botella termica infantil x500 ml. AMARILLO', 'Pequeños', 'Botellas infantiles'),
    ('Botella termica infantil x500 ml. (AZUL)', 'Pequeños', 'Botellas infantiles'),
    ('Botella termica infantil x500 ml. AZUL', 'Pequeños', 'Botellas infantiles'),
    ('Botella termica infantil x500 ml. (BLANCO)', 'Pequeños', 'Botellas infantiles'),
    ('Botella termica infantil x500 ml. VERDE', 'Pequeños', 'Botellas infantiles'),
    ('Lonchera + Termico', 'Pequeños', 'Loncheras'),
    ('BOTELLA TERMICA 750ML NEGRA', 'Térmico', 'Botellas térmicas'),
    ('Botella Térmica 950 ml', 'Térmico', 'Botellas térmicas'),
    ('Hoppie 600 ML c/ mango giratorio (ROJO)', 'Térmico', 'Vasos térmicos'),
    ('Hoppie 600 ML c/ mango giratorio (VERDE)', 'Térmico', 'Vasos térmicos'),
    ('Hoppy 650 ml', 'Térmico', 'Vasos térmicos'),
    ('Hoppy engomado 500 ml', 'Térmico', 'Vasos térmicos'),
    ('MATE LISTO AUTOCEBANTE 2 en 1 por 1000ML', 'Térmico', 'Mates autocebantes'),
    ('MATE LISTO AUTOCEBANTE  2 en 1 por 750ML', 'Térmico', 'Mates autocebantes'),
    ('Termolar Acero 2.5 Lts', 'Térmico', 'Termolares'),
    ('TERMOLAR FLIP TOP 2.5LT', 'Térmico', 'Termolares'),
    ('Vaso cervecero 473 ml', 'Térmico', 'Vasos térmicos'),
    ('Vaso Quencher 400 ml', 'Térmico', 'Vasos térmicos'),
    ('Vaso termico Quencher 1.2 L', 'Térmico', 'Vasos térmicos'),
    ('Vaso termico Quencher 400ml', 'Térmico', 'Vasos térmicos'),
    ('MATE LISTO AUTOCEBANTE 2 en 1 por 500ML', 'Termos', 'Mates autocebantes'),
    ('Termo 1l Acero', 'Termos', 'Acero inoxidable'),
    ('Termo de acero inoxidable', 'Termos', 'Acero inoxidable'),
    ('TERMO MEDIA MANIJA 1L', 'Termos', 'Media manija'),
    ('TERMO MEDIA MANIJA 1L (blanco)', 'Termos', 'Media manija'),
    ('TERMO MEDIA MANIJA 1L NEGRO', 'Termos', 'Media manija'),
    ('Termo Media manija c/ funda', 'Termos', 'Media manija'),
    ('Termo Media manija (personalizado)', 'Termos', 'Media manija'),
    ('TERMO MEDIA MANIJA (verde mate)', 'Termos', 'Media manija'),
    ('Termo Media Manija (Verde oliva claro)', 'Termos', 'Media manija'),
    ('TELA CAY', 'Yerberas', 'Tela'),
    ('Yerbera GAMUZA 250gr', 'Yerberas', 'Gamuza'),
    ('Yerbera GAMUZA 500gr', 'Yerberas', 'Gamuza')
),
resolved_assignments as (
  select
    product_assignment.product_name,
    product_categories.id as category_id,
    product_subcategories.id as subcategory_id
  from product_assignment
  join public.product_categories
    on product_categories.name = product_assignment.category_name
  join public.product_subcategories
    on product_subcategories.category_id = product_categories.id
   and product_subcategories.name = product_assignment.subcategory_name
)
update public.products
set subcategory_id = resolved_assignments.subcategory_id
from resolved_assignments
where products.category_id = resolved_assignments.category_id
  and lower(btrim(products.name)) = lower(btrim(resolved_assignments.product_name));
