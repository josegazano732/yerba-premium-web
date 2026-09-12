import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient } from "@/lib/ai/openai";
import { AI_TOOLS } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { getStoredSystemPrompt } from "@/lib/ai/settings";
import { executeTool } from "@/lib/ai/execute-tool";
import type { AiChatRequest, AiChatResponse, CartAction } from "@/lib/ai/types";
import type { Product } from "@/data/products";
import type { CartItem } from "@/lib/cart";
import { site } from "@/data/site";
import {
  updateCommerceContext,
  withRecommendedProducts,
} from "@/lib/ai/commerce-context";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as AiChatRequest;
    const { message, history = [], cart = [], currentProductId, commerceContext } = body;

    if (!message?.trim()) {
      return NextResponse.json<AiChatResponse>({ message: "Mensaje vacío.", error: "empty" }, { status: 400 });
    }

    const typedCart = cart as CartItem[];
    let nextContext = updateCommerceContext({
      previous: commerceContext,
      message,
      currentProductId,
      cart: typedCart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        categoryId: item.product.categoryId,
        categoryName: item.product.category,
        subcategoryId: item.product.subcategoryId,
        subcategoryName: item.product.subcategory,
      })),
    });

    const terminalResponse = buildTerminalResponse(nextContext);
    if (terminalResponse) {
      return NextResponse.json<AiChatResponse>({
        ...terminalResponse,
        commerceContext: nextContext,
      });
    }

    const sessionContext = {
      commerce: nextContext,
      whatsappUrl: `https://wa.me/${site.whatsappNumber}`,
      checkoutUrl: `${site.baseUrl}/checkout`,
    };

    const contextNote = `\n\n[CONTEXTO DE SESIÓN]\n${JSON.stringify(sessionContext, null, 2)}\n[/CONTEXTO DE SESIÓN]`;

    // El prompt guardado desde el panel tiene prioridad; si no existe se usa
    // la variable de entorno AI_SYSTEM_PROMPT y, en última instancia, el default.
    const storedPrompt = await getStoredSystemPrompt();
    const openai = getOpenAIClient();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt({ prompt: storedPrompt ?? undefined }) + contextNote },
      ...history.slice(-16).map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const collectedActions: CartAction[] = [];
    const collectedProducts: Product[] = [];

    let response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages,
      tools: AI_TOOLS,
      tool_choice: "auto",
      temperature: 0.5,
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

        args = applyStructuredContext(call.function.name, args, nextContext);
        const toolResult = await executeTool(call.function.name, args, typedCart);

        if (toolResult.cartAction) collectedActions.push(toolResult.cartAction);
        if (toolResult.products) collectedProducts.push(...toolResult.products);

        console.info("[ai/tool]", {
          conversationState: nextContext.state,
          intent: nextContext.intent,
          category: nextContext.categoryName,
          subcategory: nextContext.subcategoryName,
          toolUsed: call.function.name,
          productId: args.product_id,
          purchaseIntent: nextContext.purchaseIntent,
        });

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
        temperature: 0.5,
        max_tokens: 800
      });
    }

    const rawMessage = response.choices[0]?.message?.content ?? "No pude generar una respuesta. Por favor, intentá de nuevo.";
    const { text, quickReplies } = parseQuickReplies(rawMessage);
    nextContext = withRecommendedProducts(
      nextContext,
      deduplicateById(collectedProducts).map((product) => product.id)
    );

    const result: AiChatResponse = {
      message: text,
      ...(collectedProducts.length > 0 ? { products: deduplicateById(collectedProducts) } : {}),
      ...(quickReplies.length > 0 ? { quickReplies } : {}),
      ...(collectedActions.length > 0 ? { cartActions: collectedActions } : {}),
      commerceContext: nextContext,
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
  const match = text.match(/OPCIONES:\s*((?:\[[^\]]{1,40}\]\s*)+)/i);
  if (!match) return { text: text.trim(), quickReplies: [] };

  const optionMatches = match[1].match(/\[([^\]]{1,40})\]/g) ?? [];
  const quickReplies = optionMatches.map((m) => m.slice(1, -1).trim()).filter(Boolean).slice(0, 4);
  const cleanText = text.replace(match[0], "").trim();
  return { text: cleanText, quickReplies };
}

function applyStructuredContext(
  toolName: string,
  args: Record<string, unknown>,
  context: NonNullable<AiChatResponse["commerceContext"]>
): Record<string, unknown> {
  const next = { ...args };
  const productTools = new Set(["get_product", "check_stock", "add_to_cart"]);

  if (toolName === "search_products") {
    if (!next.category_id && !next.category && context.categoryId) next.category_id = context.categoryId;
    if (!next.category_id && !next.category && context.categoryName) next.category = context.categoryName;
    if (!next.subcategory_id && !next.subcategory && context.subcategoryId) {
      next.subcategory_id = context.subcategoryId;
    }
    if (!next.subcategory_id && !next.subcategory && context.subcategoryName) {
      next.subcategory = context.subcategoryName;
    }
    if (next.maxPrice === undefined && context.budget !== undefined) next.maxPrice = context.budget;
  }

  if (productTools.has(toolName) && !next.product_id && context.productId) {
    next.product_id = context.productId;
  }
  if (toolName === "add_to_cart" && next.quantity === undefined && context.quantity) {
    next.quantity = context.quantity;
  }
  return next;
}

function buildTerminalResponse(
  context: NonNullable<AiChatResponse["commerceContext"]>
): Pick<AiChatResponse, "message" | "quickReplies"> | null {
  if (context.state === "HUMAN_HANDOFF") {
    return {
      message: `Claro 👍 Podés hablar directamente con una persona por WhatsApp: https://wa.me/${site.whatsappNumber}`,
    };
  }
  if (context.state === "CHECKOUT") {
    return {
      message: `Podés finalizar tu compra de forma segura acá: ${site.baseUrl}/checkout`,
    };
  }
  if (context.state === "END") {
    return { message: "¡Gracias por escribirnos! 🧉 Cuando quieras, acá estamos." };
  }
  return null;
}

function deduplicateById(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
