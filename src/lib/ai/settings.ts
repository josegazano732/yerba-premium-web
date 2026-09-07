import { supabaseServer } from "@/lib/supabase/server";
import { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from "@/lib/ai/prompt";

export const AI_SYSTEM_PROMPT_SETTING_KEY = "ai_system_prompt";
export const AI_SYSTEM_PROMPT_MODE_KEY = "ai_system_prompt_mode";

export type AiPromptMode = "custom" | "default";
export type AiPromptSource = "custom" | "env" | "default";

export type ResolvedAiPrompt = {
  /** Origen real que está usando el agente. */
  source: AiPromptSource;
  /** Modo guardado en el panel (custom = usar el prompt de la base). */
  mode: AiPromptMode;
  /** Prompt completo que efectivamente recibe el modelo. */
  prompt: string;
  /** Prompt personalizado guardado en la base (vacío si no hay). */
  storedPrompt: string;
};

async function getSetting(key: string): Promise<string | null> {
  if (!supabaseServer) return null;

  const { data, error } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) return null;

  const value = typeof data?.value === "string" ? data.value.trim() : "";
  return value || null;
}

/**
 * Lee el prompt del sistema guardado desde el panel de administración.
 *
 * Devuelve `null` cuando el modo es "default" (o no hay prompt guardado), la
 * tabla no existe o no hay conexión; en esos casos el agente usa el prompt
 * predeterminado / variable de entorno.
 */
export async function getStoredSystemPrompt(): Promise<string | null> {
  const mode = await getSetting(AI_SYSTEM_PROMPT_MODE_KEY);
  if (mode === "default") return null;

  return getSetting(AI_SYSTEM_PROMPT_SETTING_KEY);
}

/**
 * Resuelve el prompt activo real y su origen, para previsualizarlo en el panel.
 */
export async function resolveAiPrompt(): Promise<ResolvedAiPrompt> {
  const storedPrompt = (await getSetting(AI_SYSTEM_PROMPT_SETTING_KEY)) ?? "";
  const storedMode = await getSetting(AI_SYSTEM_PROMPT_MODE_KEY);

  let source: AiPromptSource = "default";
  let basePrompt = DEFAULT_SYSTEM_PROMPT;

  if (storedMode !== "default" && storedPrompt) {
    source = "custom";
    basePrompt = storedPrompt;
  } else if (process.env.AI_SYSTEM_PROMPT?.trim()) {
    source = "env";
    basePrompt = process.env.AI_SYSTEM_PROMPT.trim();
  }

  return {
    source,
    mode: storedMode === "default" ? "default" : storedPrompt ? "custom" : "default",
    prompt: buildSystemPrompt({ prompt: basePrompt }),
    storedPrompt
  };
}
