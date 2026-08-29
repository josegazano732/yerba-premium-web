-- Índices de rendimiento para el catálogo de Mate Tierra.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- Nota: `product_details` es una vista. Los índices se crean sobre las tablas base
-- para que las consultas del catálogo (filtro por categoría, orden por precio,
-- destacados y disponibilidad) resuelvan en <50ms.

-- Filtrado por categoría (la consulta más frecuente del catálogo).
create index if not exists idx_products_category_id
  on public.products (category_id);

-- Rango de precios y ordenamiento por precio.
create index if not exists idx_products_price
  on public.products (price);

-- Destacados / temporada (orden de la home y del catálogo).
create index if not exists idx_products_seasonal
  on public.products (seasonal)
  where seasonal = true;

-- Disponibilidad (filtro de stock).
create index if not exists idx_products_stock
  on public.products (stock);

-- Categorías activas ordenadas en el menú y el panel de filtros.
create index if not exists idx_product_categories_active_order
  on public.product_categories (is_active, display_order);
