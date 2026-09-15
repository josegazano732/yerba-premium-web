-- La columna legacy `products.subcategory` (texto) quedó obsoleta con la
-- migración 20260905201500, que movió la clasificación real a
-- `products.subcategory_id` -> `product_subcategories.id`.
--
-- Esa columna seguía con NOT NULL y el panel ya no la envía (solo escribe
-- `subcategory_id`), por lo que INSERT/UPDATE fallaban con:
--   null value in column "subcategory" of relation "products" violates not-null constraint
--
-- Se quita la restricción NOT NULL para desbloquear la creación/edición de
-- productos. La columna queda deprecada: no se escribe ni se lee desde la app.
alter table public.products
  alter column subcategory drop not null;
