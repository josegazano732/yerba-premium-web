import type { Product } from "@/data/products";

export type PriceBracket = {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
};

type MaterialKeyword = { material: string; terms: string[] };

/**
 * Palabras clave para derivar el material de un producto.
 * No requiere cambios de esquema: se infiere del nombre, descripción y categoría.
 */
const MATERIAL_KEYWORDS: MaterialKeyword[] = [
  { material: "Calabaza", terms: ["calabaza", "porongo"] },
  { material: "Cuero", terms: ["cuero"] },
  { material: "Acero inoxidable", terms: ["acero", "inoxidable"] },
  { material: "Alpaca", terms: ["alpaca"] },
  { material: "Cerámica", terms: ["ceramica", "cerámica"] },
  { material: "Madera", terms: ["madera", "algarrobo", "aloja"] },
  { material: "Vidrio", terms: ["vidrio"] }
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Deriva el material de un producto para el facet de filtrado. */
export function deriveMaterial(product: Pick<Product, "name" | "description" | "category">): string {
  const haystack = normalize(`${product.name} ${product.description} ${product.category}`);
  const match = MATERIAL_KEYWORDS.find(({ terms }) =>
    terms.some((term) => haystack.includes(normalize(term)))
  );
  return match?.material ?? "Otro";
}

const numberFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Construye brackets de precio equitativos a partir del rango real del catálogo. */
export function buildPriceBrackets(min: number, max: number): PriceBracket[] {
  const lo = Math.floor(min);
  const hi = Math.ceil(max);
  if (hi <= lo) return [];

  const step = Math.max(1, Math.round((hi - lo) / 4));
  const brackets: PriceBracket[] = [];

  let start = lo;
  while (start < hi) {
    const end = Math.min(start + step, hi);
    const isLast = end >= hi;
    brackets.push({
      id: `${start}-${end}`,
      label: isLast
        ? `Más de $${numberFormatter.format(start)}`
        : `$${numberFormatter.format(start)} a $${numberFormatter.format(end)}`,
      min: start,
      max: isLast ? null : end
    });
    start = end;
  }

  return brackets;
}

/** Evalúa si un precio cae dentro de un bracket (el último bracket es abierto hacia arriba). */
export function matchesPriceBracket(price: number, bracket: PriceBracket): boolean {
  if (bracket.min !== null && price < bracket.min) return false;
  if (bracket.max !== null && price >= bracket.max) return false;
  return true;
}
