import { NextResponse } from "next/server";
import { z } from "zod";
import { getUalaOrder } from "@/lib/uala/checkout";
import { mapUalaStatus } from "@/lib/uala/webhook";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const webhookBodySchema = z.object({
  uuid: z.string().nullish(),
  external_reference: z.string().nullish(),
  status: z.string().nullish(),
  api_version: z.union([z.string(), z.number()]).nullish(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const paymentId = parsed.data.uuid;
  const orderId = parsed.data.external_reference;

  if (!paymentId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!orderId || !z.string().uuid().safeParse(orderId).success) {
    console.warn(`[uala-webhook] Pago ${paymentId} sin external_reference válido: ${orderId}.`);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    // Origen de verdad: consultar el pago real a Ualá (no confiar en el body).
    const payment = await getUalaOrder(paymentId);
    const { paymentStatus, orderStatus } = mapUalaStatus(payment.status);

    // Auditoría (idempotente por event_id, ignora duplicados).
    if (supabaseServer) {
      await supabaseServer.from("payment_webhook_events").insert({
        event_id: `uala-${paymentId}-${payment.status ?? "unknown"}`,
        event_type: "payment",
        action: `uala.${(payment.status ?? "unknown").toLowerCase()}`,
        payment_id: paymentId,
        order_id: orderId,
        payment_status: paymentStatus,
      });
    }

    if (!supabaseServer) {
      console.warn("[uala-webhook] Supabase server no configurado; no se pudo actualizar el pedido.");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { data: rpcResult, error: rpcError } = await supabaseServer.rpc(
      "process_payment_event",
      {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_payment_status: paymentStatus,
        p_order_status: orderStatus,
      }
    );

    if (rpcError) {
      if (String(rpcError.message).includes("orders_payment_id_unique")) {
        console.warn(`[uala-webhook] Pago ${paymentId} ya vinculado a otro pedido.`);
        return NextResponse.json({ error: "Pago ya procesado." }, { status: 409 });
      }
      console.error(`[uala-webhook] Error al procesar el pago ${paymentId}:`, rpcError.message);
      return NextResponse.json({ error: "Error interno." }, { status: 500 });
    }

    const result = rpcResult as { ok?: boolean; error?: string } | null;
    if (result && result.ok === false && result.error === "order_not_found") {
      console.warn(`[uala-webhook] Pedido ${orderId} no encontrado para el pago ${paymentId}.`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(
      `[uala-webhook] Pago ${paymentId} procesado: ${payment.status} → order ${orderId} (${orderStatus}).`
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error(`[uala-webhook] Error procesando la notificación del pago ${paymentId}:`, error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
