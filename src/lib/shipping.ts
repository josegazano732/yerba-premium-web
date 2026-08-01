import { site } from "@/data/site";

export type ShippingQuote = {
  id: string;
  label: string;
  description: string;
  price: number;
  eta: string;
};

export type ShippingQuoteInput = {
  postalCode: string;
  subtotal: number;
};

export const FREE_SHIPPING_THRESHOLD = 100000;

/** Tarifas locales de referencia; se reemplazan por la respuesta del proveedor cuando se integre. */
const zoneRates = [
  { id: "local", label: "Zona local (Misiones)", postalPrefixes: ["37", "33"], home: 4500, branch: 3200, eta: "1 a 2 días hábiles" },
  { id: "litoral", label: "Litoral y centro", postalPrefixes: ["3", "2", "5"], home: 7900, branch: 5900, eta: "3 a 5 días hábiles" },
  { id: "amba", label: "AMBA y Buenos Aires", postalPrefixes: ["1", "6", "7", "B"], home: 8900, branch: 6500, eta: "3 a 5 días hábiles" },
  { id: "resto", label: "Resto del país", postalPrefixes: [], home: 12500, branch: 9500, eta: "5 a 8 días hábiles" }
];

export function isValidPostalCode(postalCode: string) {
  return /^\d{4}$/.test(postalCode.trim());
}

function resolveZone(postalCode: string) {
  const clean = postalCode.trim();
  return (
    zoneRates.find((zone) => zone.postalPrefixes.some((prefix) => prefix.length === 2 && clean.startsWith(prefix))) ??
    zoneRates.find((zone) => zone.postalPrefixes.some((prefix) => prefix.length === 1 && clean.startsWith(prefix))) ??
    zoneRates[zoneRates.length - 1]
  );
}

/**
 * Punto único de integración: hoy calcula con tarifas locales y luego puede
 * delegar en el proveedor real (Andreani, OCA, Correo Argentino) sin tocar la UI.
 */
export async function getShippingQuotes({ postalCode, subtotal }: ShippingQuoteInput): Promise<ShippingQuote[]> {
  if (!isValidPostalCode(postalCode)) {
    throw new Error("Ingresá un código postal de 4 dígitos.");
  }

  const zone = resolveZone(postalCode);
  const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;

  return [
    {
      id: `${zone.id}-branch`,
      label: "Retiro en sucursal",
      description: `${zone.label} · retirás en el punto más cercano`,
      price: isFree ? 0 : zone.branch,
      eta: zone.eta
    },
    {
      id: `${zone.id}-home`,
      label: "Envío a domicilio",
      description: `${zone.label} · entrega en tu dirección`,
      price: isFree ? 0 : zone.home,
      eta: zone.eta
    },
    {
      id: "coordinar",
      label: "Coordinar por WhatsApp",
      description: `Acordamos entrega o retiro al ${site.whatsappDisplay}`,
      price: 0,
      eta: "a convenir"
    }
  ];
}
