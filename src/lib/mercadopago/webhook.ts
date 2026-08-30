import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida la procedencia de una notificación de Mercado Pago.
 *
 * El header `x-signature` llega como `ts=<timestamp>,v1=<hmac_sha256_hex>`.
 * Mercado Pago documenta el manifiesto firmado como:
 *   `id:<x-request-id>;request-id:<x-request-id>;ts:<ts>;`
 * También aceptamos la variante `ts.<body>` usada por versiones anteriores,
 * de modo que la validación siga funcionando ante cambios de formato.
 */
export function verifyMercadoPagoSignature(params: {
  signature: string | null;
  requestId: string | null;
  rawBody: string;
  secret: string | null;
}): boolean {
  const { signature, requestId, rawBody, secret } = params;

  if (!secret) return false;
  if (!signature || !requestId) return false;

  const parts = signature.split(",").map((part) => part.trim());
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=");
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }

  if (!ts || !v1) return false;

  const candidates = [
    `id:${requestId};request-id:${requestId};ts:${ts};`,
    `${ts}.${rawBody}`,
  ];

  return candidates.some((candidate) => {
    const computed = createHmac("sha256", secret).update(candidate).digest("hex");
    return safeEqual(computed, v1 as string);
  });
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export type MappedPaymentEvent = {
  paymentStatus: string;
  orderStatus: string;
};

/**
 * Mapea estados de Mercado Pago → estados internos (spec §24).
 * Solo se descuenta stock cuando el resultado es `approved` + `confirmed`.
 */
export function mapMercadoPagoStatus(status: string | null): MappedPaymentEvent {
  switch (status) {
    case "approved":
      return { paymentStatus: "approved", orderStatus: "confirmed" };
    case "in_process":
    case "pending":
    case "authorized":
    case "in_mediation":
      return { paymentStatus: "in_process", orderStatus: "pending" };
    case "rejected":
      return { paymentStatus: "rejected", orderStatus: "pending" };
    case "cancelled":
      return { paymentStatus: "cancelled", orderStatus: "cancelled" };
    case "refunded":
    case "charged_back":
      return { paymentStatus: "refunded", orderStatus: "cancelled" };
    default:
      return { paymentStatus: "in_process", orderStatus: "pending" };
  }
}
