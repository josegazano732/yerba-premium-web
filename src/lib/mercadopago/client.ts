import { MercadoPagoConfig } from "mercadopago";

/**
 * Instancia del cliente de Mercado Pago (SDK v3).
 * Devuelve null si MERCADOPAGO_ACCESS_TOKEN no está configurado.
 * Solo debe usarse desde el servidor.
 */
export function getMercadoPagoClient(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;

  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 },
  });
}
