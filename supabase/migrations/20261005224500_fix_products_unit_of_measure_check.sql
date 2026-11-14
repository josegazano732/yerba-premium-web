-- Alinea la restriccion de unidad de medida con los valores que escribe la app.
--
-- El formulario de alta (ProductAdmin) solo envia "unidad" o "gramos", pero la
-- restriccion original no incluia "gramos", por lo que los productos por peso
-- fallaban con: products_unit_of_measure_check.
--
-- Se reemplaza por una lista que cubre:
--   - La unidad por defecto: "unidad"
--   - La opcion de peso del formulario: "gramos"
--   - Los valores ya existentes en la tabla: "kg", "gs"
--   - Las unidades que el catalogo mayorista reconoce como peso
--     (WholesaleCatalog.tsx): "gramo", "g", "kilo", "kilos"

alter table public.products
  drop constraint if exists products_unit_of_measure_check;

alter table public.products
  add constraint products_unit_of_measure_check
  check (
    unit_of_measure is null
    or unit_of_measure in ('unidad', 'gramos', 'gramo', 'gs', 'g', 'kg', 'kilo', 'kilos')
  );
