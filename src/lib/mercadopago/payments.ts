import { Payment } from "mercadopago";
import { getMercadoPagoClient } from "./client";

export type PaymentStatusResult = {
  id: string;
  status: string | null;
  externalReference: string | null;
};

/**
 * Consulta el estado real de un pago en Mercado Pago.
 * El webhook nunca debe confiar en el body de la notificación; este es el
 * origen de verdad para `status` y `external_reference`.
 */
export async function getPaymentById(paymentId: string): Promise<PaymentStatusResult> {
  const client = getMercadoPagoClient();
  if (!client) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }

  const payment = new Payment(client);
  const response = await payment.get({ id: paymentId });

  return {
    id: String(response.id ?? paymentId),
    status: response.status ?? null,
    externalReference: response.external_reference ?? null,
  };
}
