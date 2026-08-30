import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { getSiteUrl } from "@/lib/site-url";

export type CheckoutPreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
};

export type CheckoutPreferenceInput = {
  orderId: string;
  items: CheckoutPreferenceItem[];
  customerEmail?: string | null;
};

export type CheckoutPreferenceResult = {
  id: string;
  initPoint: string;
};

/**
 * Crea una Preference de Checkout Pro.
 * El `external_reference` es el id del pedido local; el webhook lo usa para
 * asociar el pago con la orden.
 */
export async function createCheckoutPreference(
  input: CheckoutPreferenceInput
): Promise<CheckoutPreferenceResult> {
  const client = getMercadoPagoClient();
  if (!client) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }

  const siteUrl = getSiteUrl();
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      items: input.items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "ARS",
      })),
      external_reference: input.orderId,
      auto_return: "approved",
      back_urls: {
        success: `${siteUrl}/checkout/success?order_id=${input.orderId}`,
        pending: `${siteUrl}/checkout/pending?order_id=${input.orderId}`,
        failure: `${siteUrl}/checkout/failure?order_id=${input.orderId}`,
      },
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      ...(input.customerEmail ? { payer: { email: input.customerEmail } } : {}),
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error("La respuesta de Mercado Pago no incluyó una Preference válida.");
  }

  return { id: response.id, initPoint: response.init_point };
}

/**
 * Recupera una Preference existente para reutilizar su init_point cuando el
 * pedido ya la tiene guardada (evita crear Preferences ilimitadas, spec §13).
 */
export async function getPreferenceById(
  preferenceId: string
): Promise<CheckoutPreferenceResult | null> {
  const client = getMercadoPagoClient();
  if (!client) return null;

  const preference = new Preference(client);
  const response = await preference.get({ preferenceId });

  if (!response.id || !response.init_point) return null;
  return { id: response.id, initPoint: response.init_point };
}
