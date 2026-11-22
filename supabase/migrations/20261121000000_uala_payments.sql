-- ============================================================================
-- Mate Tierra — Migración de Mercado Pago a Ualá (API Cobros Online v2).
-- Ejecutar una sola vez en el SQL Editor de Supabase o vía `supabase db push`.
--
-- Cambios:
--   * Agrega `uala_order_uuid` para guardar el uuid de la orden de pago de Ualá.
--   * Cambia el provider por defecto de 'mercadopago' a 'uala'.
--   * Mantiene `mercadopago_preference_id` para no romper datos existentes.
-- ============================================================================

alter table public.orders
  add column if not exists uala_order_uuid text;

alter table public.orders
  alter column payment_provider set default 'uala';
