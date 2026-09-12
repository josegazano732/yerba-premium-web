"use client";

import { ENV_DEFAULT_STORE_CONFIG, STORE_FEATURE_KEYS, parseBooleanFlag } from "@/config/store";
import { supabase } from "@/lib/supabase";

export async function resolveKitBuilder3DEnabledClient(): Promise<boolean> {
  const fallback = ENV_DEFAULT_STORE_CONFIG.features.kitBuilder3D;
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", STORE_FEATURE_KEYS.kitBuilder3D)
    .maybeSingle();

  if (error) return fallback;
  const value = typeof data?.value === "string" ? data.value : null;
  return parseBooleanFlag(value, fallback);
}
