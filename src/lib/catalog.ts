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
      .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
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

  return {
    products,
    categories: (categoriesResult.data as StoreCategory[] | null) ?? []
  };
}
