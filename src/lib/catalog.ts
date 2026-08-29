import { mapProductDetails, Product, ProductDetailsRow } from "@/data/products";
import { supabase } from "@/lib/supabase";

export type StoreCategory = {
  name: string;
  slug: string | null;
  image_url: string | null;
};

export type CatalogSnapshot = {
  products: Product[];
  categories: StoreCategory[];
};

/** Columnas mínimas que consume la UI (evita cost, markup_percentage, updated_at, etc.). */
const PRODUCT_COLUMNS = "id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal";

let catalogRequest: Promise<CatalogSnapshot> | null = null;

/** Comparte una unica peticion entre todas las secciones del home. */
export function getCatalog(): Promise<CatalogSnapshot> {
  if (!catalogRequest) {
    catalogRequest = fetchCatalog().catch((error) => {
      catalogRequest = null;
      throw error;
    });
  }

  return catalogRequest;
}

async function fetchCatalog(): Promise<CatalogSnapshot> {
  if (!supabase) return { products: [], categories: [] };

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("product_details")
      .select(PRODUCT_COLUMNS)
      .not("image", "is", null)
      .order("name"),
    supabase
      .from("product_categories")
      .select("name,slug,image_url")
      .eq("is_active", true)
      .order("display_order")
  ]);

  const products = (productsResult.data as ProductDetailsRow[] | null)
    ?.map(mapProductDetails)
    .filter((product): product is Product => product !== null) ?? [];

  if (productsResult.error) console.error("[catalog] product_details:", productsResult.error);
  if (categoriesResult.error) console.error("[catalog] product_categories:", categoriesResult.error);

  return {
    products,
    categories: (categoriesResult.data as StoreCategory[] | null) ?? []
  };
}

/** Rango de precios real del catálogo para construir los brackets del filtro de precio. */
export async function fetchPriceBounds(): Promise<{ min: number; max: number }> {
  if (!supabase) return { min: 0, max: 0 };

  const [minResult, maxResult] = await Promise.all([
    supabase
      .from("product_details")
      .select("price")
      .gt("price", 0)
      .order("price", { ascending: true })
      .limit(1),
    supabase
      .from("product_details")
      .select("price")
      .gt("price", 0)
      .order("price", { ascending: false })
      .limit(1)
  ]);

  const min = Number((minResult.data?.[0] as { price?: number | string } | undefined)?.price ?? 0);
  const max = Number((maxResult.data?.[0] as { price?: number | string } | undefined)?.price ?? 0);

  return { min, max };
}
