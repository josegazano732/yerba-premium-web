import { NextResponse } from "next/server";
import { createCheckoutSchema } from "@/lib/orders/schema";
import { getOrderById } from "@/lib/orders/orders";
import { createUalaCheckout } from "@/lib/uala/checkout";
import { supabaseServer } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createCheckoutSchema.safeParse(payload);
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
    if (!order.items.length && !(order.combos?.length)) {
      return NextResponse.json({ error: "El pedido no tiene productos." }, { status: 409 });
    }

    const siteUrl = getSiteUrl();
    const { uuid, checkoutLink } = await createUalaCheckout({
      amount: order.total.toFixed(2),
      description: `Pedido ${orderId.slice(0, 8)} — Mate Tierra`,
      callbackSuccess: `${siteUrl}/checkout/success?order_id=${orderId}`,
      callbackFail: `${siteUrl}/checkout/failure?order_id=${orderId}`,
      notificationUrl: `${siteUrl}/api/webhooks/uala`,
      externalReference: orderId,
    });

    if (supabaseServer) {
      await supabaseServer
        .from("orders")
        .update({ uala_order_uuid: uuid })
        .eq("id", orderId);
    }

    return NextResponse.json({ checkoutLink, orderId }, { status: 200 });
  } catch (error) {
    console.error("[uala] Error al crear el checkout:", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
