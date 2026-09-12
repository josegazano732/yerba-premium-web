import { supabase } from "@/lib/supabase";

export const COMBO_ENABLED_KEY = "combos_enabled";

export type ComboProductItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  stock: number;
};

export type Combo = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  regularPrice: number;
  savings: number;
  savingsPercent: number;
  active: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  items: ComboProductItem[];
  available: boolean;
};

export type ComboRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number | string | null;
  active: boolean;
  sort_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComboItemRow = {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string | null;
  stock: number | string | null;
  image: string | null;
};

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function comboMetrics(price: number, regularPrice: number) {
  const savings = roundMoney(Math.max(regularPrice - price, 0));
  const savingsPercent = regularPrice > 0 ? Math.round((savings / regularPrice) * 100) : 0;
  return { savings, savingsPercent };
}

/** Indica si un combo está dentro de su ventana de promoción (si la tiene). */
export function isComboInPromoWindow(
  combo: Pick<ComboRow, "starts_at" | "ends_at">
): boolean {
  const now = Date.now();
  const startsAt = combo.starts_at ? new Date(combo.starts_at).getTime() : null;
  const endsAt = combo.ends_at ? new Date(combo.ends_at).getTime() : null;

  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

/** Lee la configuración global que muestra/oculta la sección de combos. */
export async function fetchCombosEnabled(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", COMBO_ENABLED_KEY)
    .maybeSingle();

  if (error || !data) return false;
  return String(data.value).trim().toLowerCase() === "true";
}

/**
 * Devuelve los combos activos (y dentro de su vigencia) con sus productos
 * resueltos, precios de referencia, ahorro y disponibilidad de stock.
 */
export async function fetchActiveCombos(): Promise<Combo[]> {
  if (!supabase) return [];

  const { data: comboRows, error: combosError } = await supabase
    .from("combos")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (combosError || !comboRows) return [];

  const activeRows = (comboRows as ComboRow[]).filter(isComboInPromoWindow);
  if (activeRows.length === 0) return [];

  const comboIds = activeRows.map((combo) => combo.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("combo_items")
    .select("id, combo_id, product_id, quantity")
    .in("combo_id", comboIds);

  if (itemsError) return [];

  const items = (itemRows ?? []) as ComboItemRow[];
  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  if (productIds.length === 0) return [];

  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock, image")
    .in("id", productIds);

  if (productsError) return [];

  const products = new Map<string, ProductRow>(
    ((productRows ?? []) as ProductRow[]).map((product) => [product.id, product])
  );

  return activeRows.map((combo): Combo => {
    const comboItems = items
      .filter((item) => item.combo_id === combo.id)
      .map((item): ComboProductItem | null => {
        const product = products.get(item.product_id);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          image: product.image ?? "",
          unitPrice: toNumber(product.price),
          quantity: item.quantity,
          stock: Math.floor(toNumber(product.stock)),
        };
      })
      .filter((item): item is ComboProductItem => item !== null);

    const regularPrice = roundMoney(
      comboItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );
    const price = toNumber(combo.price);
    const { savings, savingsPercent } = comboMetrics(price, regularPrice);

    return {
      id: combo.id,
      name: combo.name,
      description: combo.description ?? "",
      image: combo.image ?? comboItems[0]?.image ?? "",
      price,
      regularPrice,
      savings,
      savingsPercent,
      active: combo.active,
      sortOrder: Number(combo.sort_order ?? 0),
      startsAt: combo.starts_at ?? null,
      endsAt: combo.ends_at ?? null,
      items: comboItems,
      available:
        comboItems.length > 0 &&
        comboItems.every((item) => item.stock >= item.quantity),
    };
  });
}
