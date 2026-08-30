import { NextResponse } from "next/server";
import { createPreferenceSchema } from "@/lib/orders/schema";
import { getOrderById } from "@/lib/orders/orders";
import { createCheckoutPreference, getPreferenceById } from "@/lib/mercadopago/preferences";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createPreferenceSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "orderId inválido." }, { status: 400 });
  }

  const { orderId } = parsed.data;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Pedido inexistente." }, { status: 404 });
    }
    if (order.paymentStatus === "approved" || order.status === "confirmed") {
      return NextResponse.json({ error: "El pedido ya fue pagado." }, { status: 409 });
    }
    if (!order.items.length) {
      return NextResponse.json({ error: "El pedido no tiene productos." }, { status: 409 });
    }

    // Reutilizar la Preference existente si ya fue creada para este pedido (spec §13).
    if (order.mercadopagoPreferenceId) {
      const existing = await getPreferenceById(order.mercadopagoPreferenceId);
      if (existing) {
        return NextResponse.json(
          { preferenceId: existing.id, initPoint: existing.initPoint, orderId },
          { status: 200 }
        );
      }
    }

    const { id: preferenceId, initPoint } = await createCheckoutPreference({
      orderId: order.id,
      customerEmail: order.customerEmail,
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });

    if (supabaseServer) {
      await supabaseServer
        .from("orders")
        .update({ mercadopago_preference_id: preferenceId })
        .eq("id", orderId);
    }

    return NextResponse.json({ preferenceId, initPoint, orderId }, { status: 200 });
  } catch (error) {
    console.error("[mercadopago] Error al crear la Preference:", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
