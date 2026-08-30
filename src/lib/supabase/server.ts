import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente con rol de servicio. USO EXCLUSIVO en rutas de API / server actions.
 *
 * La service role key ignora RLS y nunca debe exponerse al navegador:
 * no usar el prefijo NEXT_PUBLIC_ y no importar este módulo desde un
 * componente "use client".
 */
export const supabaseServer =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
