import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMercadoPagoSignature, mapMercadoPagoStatus } from "@/lib/mercadopago/webhook";
import { getPaymentById } from "@/lib/mercadopago/payments";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const webhookBodySchema = z.object({
  id: z.number().or(z.string()).nullish(),
  type: z.string().nullish(),
  action: z.string().nullish(),
  data: z
    .object({
      id: z.string().nullish(),
    })
    .nullish(),
});

const RELEVANT_ACTIONS = new Set([
  "payment.created",
  "payment.updated",
  "payment.approved",
  "payment.rejected",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? null;

  // Validación de procedencia (spec §18). Si el secreto está configurado,
  // una firma inválida se rechaza con 401.
  if (secret) {
    const valid = verifyMercadoPagoSignature({ signature, requestId, rawBody, secret });
    if (!valid) {
      console.warn("[webhook] Firma inválida recibida y rechazada.");
      return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
    }
  } else {
    console.warn(
      "[webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado: se procesa sin validar firma (configurar en producción)."
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { type, action, data } = parsed.data;

  // Solo procesamos notificaciones de pago (spec §18).
  if (type !== "payment") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (action && !RELEVANT_ACTIONS.has(action)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const paymentId = data?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    // Origen de verdad: consultar el pago real a Mercado Pago (spec §19).
    const payment = await getPaymentById(paymentId);
    const orderId = payment.externalReference;

    if (!orderId || !z.string().uuid().safeParse(orderId).success) {
      console.warn(`[webhook] Pago ${paymentId} sin external_reference válido: ${orderId}.`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { paymentStatus, orderStatus } = mapMercadoPagoStatus(payment.status);

    // Auditoría (idempotente por event_id, ignora duplicados).
    if (supabaseServer) {
      await supabaseServer.from("payment_webhook_events").insert({
        event_id: parsed.data.id ? String(parsed.data.id) : null,
        event_type: type,
        action,
        payment_id: paymentId,
        order_id: orderId,
        payment_status: paymentStatus,
      });
    }

    if (!supabaseServer) {
      console.warn("[webhook] Supabase server no configurado; no se pudo actualizar el pedido.");
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
        console.warn(`[webhook] Pago ${paymentId} ya vinculado a otro pedido.`);
        return NextResponse.json({ error: "Pago ya procesado." }, { status: 409 });
      }
      console.error(`[webhook] Error al procesar el pago ${paymentId}:`, rpcError.message);
      return NextResponse.json({ error: "Error interno." }, { status: 500 });
    }

    const result = rpcResult as { ok?: boolean; error?: string } | null;
    if (result && result.ok === false && result.error === "order_not_found") {
      console.warn(`[webhook] Pedido ${orderId} no encontrado para el pago ${paymentId}.`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log(
      `[webhook] Pago ${paymentId} procesado: ${payment.status} → order ${orderId} (${orderStatus}).`
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error(`[webhook] Error procesando la notificación del pago ${paymentId}:`, error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
