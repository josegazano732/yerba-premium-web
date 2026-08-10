import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient } from "@/lib/ai/openai";
import { AI_TOOLS } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { executeTool } from "@/lib/ai/execute-tool";
import type { AiChatRequest, AiChatResponse, CartAction } from "@/lib/ai/types";
import type { Product } from "@/data/products";
import type { CartItem } from "@/lib/cart";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as AiChatRequest;
    const { message, history = [], cart = [], currentProductId } = body;

    if (!message?.trim()) {
      return NextResponse.json<AiChatResponse>({ message: "Mensaje vacío.", error: "empty" }, { status: 400 });
    }

    const openai = getOpenAIClient();

    // Contexto de sesión: estado del carrito para que el agente razone sobre complementariedad
    const cartSummary = {
      items: (cart as CartItem[]).map((i) => ({
        name: i.product.name,
        category: i.product.category,
        quantity: i.quantity,
      })),
      total: (cart as CartItem[]).reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      categoriesInCart: [...new Set((cart as CartItem[]).map((i) => i.product.category))],
    };

    const sessionContext = {
      cart: cartSummary,
      ...(currentProductId ? { currentProduct: { id: currentProductId } } : {}),
    };

    const contextNote = `\n\n[CONTEXTO DE SESIÓN]\n${JSON.stringify(sessionContext, null, 2)}\n[/CONTEXTO DE SESIÓN]`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...history.slice(-12).map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const collectedActions: CartAction[] = [];
    const collectedProducts: Product[] = [];

    let response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages,
      tools: AI_TOOLS,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 800
    });

    // Tool-calling loop: máximo 5 iteraciones
    let iterations = 0;
    while (response.choices[0]?.finish_reason === "tool_calls" && iterations < 5) {
      iterations++;
      const assistantMsg = response.choices[0].message;
      messages.push(assistantMsg);

      for (const call of assistantMsg.tool_calls ?? []) {
        if (call.type !== "function") continue;

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        } catch {
          // argumentos malformados
        }

        const toolResult = await executeTool(call.function.name, args, cart as CartItem[]);

        if (toolResult.cartAction) collectedActions.push(toolResult.cartAction);
        if (toolResult.products) collectedProducts.push(...toolResult.products);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult.result)
        });
      }

      response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages,
        tools: AI_TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 800
      });
    }

    const rawMessage = response.choices[0]?.message?.content ?? "No pude generar una respuesta. Por favor, intentá de nuevo.";
    const { text, quickReplies } = parseQuickReplies(rawMessage);

    const result: AiChatResponse = {
      message: text,
      ...(collectedProducts.length > 0 ? { products: deduplicateById(collectedProducts) } : {}),
      ...(quickReplies.length > 0 ? { quickReplies } : {}),
      ...(collectedActions.length > 0 ? { cartActions: collectedActions } : {})
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[ai/chat]", error);
    const isApiKeyError = error instanceof Error && error.message.includes("DEEPSEEK_API_KEY");

    return NextResponse.json<AiChatResponse>(
      {
        message: isApiKeyError
          ? "La IA no está configurada todavía. Podés contactarnos por WhatsApp."
          : "Ocurrió un error inesperado. Por favor, intentá de nuevo en unos momentos.",
        error: "internal"
      },
      { status: isApiKeyError ? 503 : 500 }
    );
  }
}

/** Extrae la línea "OPCIONES: [A] [B]" del mensaje y la convierte en un array de strings. */
function parseQuickReplies(text: string): { text: string; quickReplies: string[] } {
  const match = text.match(/OPCIONES:\s*((?:\[[^\]]{1,50}\]\s*)+)/i);
  if (!match) return { text: text.trim(), quickReplies: [] };

  const optionMatches = match[1].match(/\[([^\]]{1,50})\]/g) ?? [];
  const quickReplies = optionMatches.map((m) => m.slice(1, -1).trim()).filter(Boolean).slice(0, 4);
  const cleanText = text.replace(match[0], "").trim();
  return { text: cleanText, quickReplies };
}

function deduplicateById(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
