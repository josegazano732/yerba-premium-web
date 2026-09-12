import { createClient } from "@supabase/supabase-js";
import { ENV_DEFAULT_STORE_CONFIG, STORE_FEATURE_KEYS, parseBooleanFlag } from "@/config/store";

async function getSiteSetting(key: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) return null;
  return typeof data?.value === "string" ? data.value : null;
}

export async function resolveKitBuilder3DEnabledServer(): Promise<boolean> {
  const fallback = ENV_DEFAULT_STORE_CONFIG.features.kitBuilder3D;
  const storedValue = await getSiteSetting(STORE_FEATURE_KEYS.kitBuilder3D);
  return parseBooleanFlag(storedValue, fallback);
}
