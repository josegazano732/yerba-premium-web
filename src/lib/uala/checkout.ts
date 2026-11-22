import { getUalaAccessToken } from "./client";
import { getUalaConfig } from "./config";

export type UalaCheckoutInput = {
  /** Monto en ARS como string, hasta 2 decimales con punto (ej. "3005.50"). */
  amount: string;
  description: string;
  callbackSuccess: string;
  callbackFail: string;
  notificationUrl?: string;
  externalReference?: string;
};

export type UalaCheckoutResult = {
  uuid: string;
  checkoutLink: string;
};

export type UalaOrderStatus = {
  uuid: string;
  status: string | null;
  externalReference: string | null;
};

/**
 * Crea una orden de pago en Ualá y devuelve el link de redirección
 * (`links.checkout_link`) junto con el `uuid` de la orden.
 */
export async function createUalaCheckout(
  input: UalaCheckoutInput
): Promise<UalaCheckoutResult> {
  const config = getUalaConfig();
  const token = await getUalaAccessToken();

  const response = await fetch(`${config.checkoutBaseUrl}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      description: input.description,
      callback_fail: input.callbackFail,
      callback_success: input.callbackSuccess,
      notification_url: input.notificationUrl,
      external_reference: input.externalReference,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ualá no pudo crear el pago (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    uuid?: string;
    links?: { checkout_link?: string };
  };

  if (!data.uuid || !data.links?.checkout_link) {
    throw new Error("La respuesta de Ualá no incluyó un checkout_link válido.");
  }

  return { uuid: data.uuid, checkoutLink: data.links.checkout_link };
}

/**
 * Consulta el estado real de una orden en Ualá. El webhook usa este método
 * como origen de verdad en lugar de confiar en el body de la notificación.
 */
export async function getUalaOrder(uuid: string): Promise<UalaOrderStatus> {
  const config = getUalaConfig();
  const token = await getUalaAccessToken();

  const response = await fetch(
    `${config.checkoutBaseUrl}/orders/${encodeURIComponent(uuid)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ualá no pudo consultar el pago (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    uuid?: string;
    status?: string | null;
    external_reference?: string | null;
  };

  return {
    uuid: String(data.uuid ?? uuid),
    status: data.status ?? null,
    externalReference: data.external_reference ?? null,
  };
}
