import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveAiPrompt } from "@/lib/ai/settings";

export const dynamic = "force-dynamic";

/**
 * Verifica que el request venga con una sesión válida de Supabase.
 * El admin ya inicia sesión en el navegador; acá solo validamos el JWT.
 */
async function resolveSession(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!supabaseServer || !token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(request: Request) {
  const user = await resolveSession(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const resolved = await resolveAiPrompt();
  return NextResponse.json(resolved);
}
