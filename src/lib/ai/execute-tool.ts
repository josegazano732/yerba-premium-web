import { mapProductDetails, Product, ProductDetailsRow } from "@/data/products";
import { supabase } from "@/lib/supabase";
import { CartItem } from "@/lib/cart";
import { CartAction } from "@/lib/ai/types";

export type CommerceErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "OUT_OF_STOCK"
  | "INVALID_QUANTITY"
  | "INVALID_VARIANT"
  | "PRODUCT_INACTIVE"
  | "PRICE_CHANGED"
  | "INVALID_TAXONOMY"
  | "CART_ITEM_NOT_FOUND"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ToolResult = {
  result: unknown;
  cartAction?: CartAction;
  products?: Product[];
};

type CategoryRow = {
  id: string;
  name: string;
};

type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
};

type ProductRelationRow = {
  id: string;
  category_id: string;
  subcategory_id: string;
};

type TaxonomySelection = {
  category?: CategoryRow;
  subcategory?: SubcategoryRow;
};

const PRODUCT_COLUMNS =
  "id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal";

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  cart: CartItem[]
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(args);
    case "get_product":
      return getProduct(String(args.product_id ?? ""));
    case "check_stock":
      return checkStock(String(args.product_id ?? ""));
    case "add_to_cart":
      return addToCart(String(args.product_id ?? ""), Number(args.quantity ?? 1), cart);
    case "update_cart_quantity":
      return updateCartQuantity(String(args.product_id ?? ""), Number(args.quantity ?? 0), cart);
    case "remove_from_cart":
      return removeFromCart(String(args.product_id ?? ""), cart);
    case "get_cart":
      return getCartState(cart);
    default:
      return commerceError("INTERNAL_ERROR", `Herramienta '${toolName}' no reconocida.`);
  }
}

async function searchProducts(args: Record<string, unknown>): Promise<ToolResult> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  const minPrice = optionalFiniteNumber(args.minPrice);
  const maxPrice = optionalFiniteNumber(args.maxPrice);
  if ((args.minPrice !== undefined && minPrice === undefined) || (args.maxPrice !== undefined && maxPrice === undefined)) {
    return commerceError("INTERNAL_ERROR", "El rango de precio no es válido.");
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return commerceError("INTERNAL_ERROR", "El precio mínimo no puede superar al máximo.");
  }

  const taxonomy = await resolveTaxonomy(args);
  if ("result" in taxonomy) return taxonomy;

  const requestedProductId = stringArg(args.product_id);
  const queryText = stringArg(args.query);
  const limit = clampInteger(args.limit, 5, 1, 8);
  const attempts = buildSearchAttempts(taxonomy);
  let selectedAttempt = attempts[0];
  let rows: ProductDetailsRow[] = [];
  let relations = new Map<string, ProductRelationRow>();

  for (const attempt of attempts) {
    const relationRows = await fetchProductRelations(attempt, requestedProductId);
    if ("result" in relationRows) return relationRows;
    if (relationRows.length === 0 && (attempt.category || attempt.subcategory || requestedProductId)) {
      continue;
    }

    const details = await fetchProductDetails({
      productIds: relationRows.map((row) => row.id),
      requestedProductId,
      minPrice,
      maxPrice,
    });
    if ("result" in details) return details;
    if (details.length === 0) continue;

    selectedAttempt = attempt;
    rows = details;
    relations = new Map(relationRows.map((row) => [row.id, row]));
    break;
  }

  if (rows.length === 0) {
    return {
      result: {
        success: true,
        count: 0,
        products: [],
        matchLevel: "none",
        message: "No encontramos productos con esos criterios.",
      },
      products: [],
    };
  }

  const taxonomyMaps = await loadTaxonomyMaps(relations);
  if ("result" in taxonomyMaps) return taxonomyMaps;

  const ranked = rows
    .map((row) => {
      const product = mapProductDetails(row);
      if (!product) return null;
      const relation = relations.get(product.id);
      const category = relation ? taxonomyMaps.categories.get(relation.category_id) : undefined;
      const subcategory = relation ? taxonomyMaps.subcategories.get(relation.subcategory_id) : undefined;
      const enriched: Product = {
        ...product,
        categoryId: category?.id,
        category: category?.name ?? product.category,
        subcategoryId: subcategory?.id,
        subcategory: subcategory?.name,
      };

      return {
        product: enriched,
        score: scoreProduct(enriched, queryText, taxonomy, minPrice, maxPrice),
      };
    })
    .filter((entry): entry is { product: Product; score: number } => entry !== null)
    .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
    .slice(0, limit);

  const products = ranked.map(({ product }) => product);
  return {
    result: {
      success: true,
      count: products.length,
      matchLevel: getMatchLevel(selectedAttempt, taxonomy),
      products: ranked.map(({ product, score }) => toToolProduct(product, score)),
    },
    products,
  };
}

async function getProduct(productId: string): Promise<ToolResult> {
  if (!productId) return commerceError("PRODUCT_NOT_FOUND", "product_id requerido.");
  const product = await fetchEnrichedProduct(productId);
  if ("result" in product) return product;

  return {
    result: { success: true, ...toToolProduct(product) },
    products: [product],
  };
}

async function checkStock(productId: string): Promise<ToolResult> {
  if (!productId) return commerceError("PRODUCT_NOT_FOUND", "product_id requerido.");
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  const { data, error } = await supabase
    .from("product_details")
    .select("id,name,stock")
    .eq("id", productId)
    .maybeSingle();

  if (error) return commerceError("INTERNAL_ERROR", "No se pudo consultar el stock.");
  if (!data) return commerceError("PRODUCT_NOT_FOUND", "Producto no encontrado o inactivo.");

  const row = data as { id: string; name: string; stock: number | string | null };
  const stock = Number(row.stock ?? 0);
  return {
    result: {
      success: true,
      product_id: productId,
      name: row.name,
      stock,
      available: stock > 0,
    },
  };
}

async function addToCart(productId: string, quantity: number, cart: CartItem[]): Promise<ToolResult> {
  if (!productId) return commerceError("PRODUCT_NOT_FOUND", "product_id requerido.");
  if (!Number.isInteger(quantity) || quantity < 1) {
    return commerceError("INVALID_QUANTITY", "La cantidad debe ser un entero mayor a 0.");
  }

  const product = await fetchEnrichedProduct(productId);
  if ("result" in product) return product;
  if (product.stock < 1) {
    return commerceError("OUT_OF_STOCK", `${product.name} no tiene stock disponible.`);
  }

  const existingQty = cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  if (existingQty + quantity > product.stock) {
    return commerceError(
      "OUT_OF_STOCK",
      `Solo hay ${product.stock} unidades de ${product.name}. Ya tenés ${existingQty} en el carrito.`
    );
  }

  return {
    result: {
      success: true,
      product_id: productId,
      name: product.name,
      quantity,
      price: product.price,
      stockRemaining: product.stock - existingQty - quantity,
    },
    cartAction: { type: "add", product, quantity },
    products: [product],
  };
}

async function updateCartQuantity(
  productId: string,
  quantity: number,
  cart: CartItem[]
): Promise<ToolResult> {
  if (!productId) return commerceError("PRODUCT_NOT_FOUND", "product_id requerido.");
  if (!Number.isInteger(quantity) || quantity < 0) {
    return commerceError("INVALID_QUANTITY", "La cantidad debe ser un entero igual o mayor a 0.");
  }

  const item = cart.find((entry) => entry.product.id === productId);
  if (!item) return commerceError("CART_ITEM_NOT_FOUND", "El producto no está en el carrito.");
  if (quantity === 0) return removeFromCart(productId, cart);

  const product = await fetchEnrichedProduct(productId);
  if ("result" in product) return product;
  if (quantity > product.stock) {
    return commerceError("OUT_OF_STOCK", `Solo hay ${product.stock} unidades de ${product.name}.`);
  }

  return {
    result: { success: true, product_id: productId, name: product.name, quantity, price: product.price },
    cartAction: { type: "update", productId, quantity },
    products: [product],
  };
}

function removeFromCart(productId: string, cart: CartItem[]): ToolResult {
  if (!productId || !cart.some((item) => item.product.id === productId)) {
    return commerceError("CART_ITEM_NOT_FOUND", "El producto no está en el carrito.");
  }

  return {
    result: { success: true, product_id: productId, message: "Producto eliminado del carrito." },
    cartAction: { type: "remove", productId },
  };
}

function getCartState(cart: CartItem[]): ToolResult {
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return {
    result: {
      success: true,
      items: cart.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        currentUnitPrice: item.product.price,
        category: {
          id: item.product.categoryId ?? null,
          name: item.product.category,
        },
        subcategory: item.product.subcategory
          ? { id: item.product.subcategoryId ?? null, name: item.product.subcategory }
          : null,
        subtotal: item.product.price * item.quantity,
      })),
      total,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    },
  };
}

async function resolveTaxonomy(
  args: Record<string, unknown>
): Promise<TaxonomySelection | ToolResult> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  const categoryId = stringArg(args.category_id);
  const categoryName = stringArg(args.category);
  const subcategoryId = stringArg(args.subcategory_id);
  const subcategoryName = stringArg(args.subcategory);
  let category: CategoryRow | undefined;
  let subcategory: SubcategoryRow | undefined;

  if (categoryId || categoryName) {
    let categoryQuery = supabase
      .from("product_categories")
      .select("id,name")
      .eq("is_active", true);
    categoryQuery = categoryId
      ? categoryQuery.eq("id", categoryId)
      : categoryQuery.ilike("name", categoryName as string);
    const { data, error } = await categoryQuery.maybeSingle();
    if (error) return commerceError("INTERNAL_ERROR", "No se pudo validar la categoría.");
    if (!data) return commerceError("INVALID_TAXONOMY", "La categoría indicada no existe o está inactiva.");
    category = data as CategoryRow;
  }

  if (subcategoryId || subcategoryName) {
    let subcategoryQuery = supabase
      .from("product_subcategories")
      .select("id,category_id,name")
      .eq("is_active", true);
    subcategoryQuery = subcategoryId
      ? subcategoryQuery.eq("id", subcategoryId)
      : subcategoryQuery.ilike("name", subcategoryName as string);
    if (category) subcategoryQuery = subcategoryQuery.eq("category_id", category.id);
    const { data, error } = await subcategoryQuery.limit(2);
    if (error) return commerceError("INTERNAL_ERROR", "No se pudo validar la subcategoría.");
    const matches = (data as SubcategoryRow[] | null) ?? [];
    if (matches.length !== 1) {
      return commerceError(
        "INVALID_TAXONOMY",
        matches.length === 0
          ? "La subcategoría indicada no existe dentro de la categoría."
          : "La subcategoría es ambigua; indicá también la categoría."
      );
    }
    subcategory = matches[0];
    if (category && subcategory.category_id !== category.id) {
      return commerceError("INVALID_TAXONOMY", "La subcategoría no pertenece a la categoría indicada.");
    }
  }

  if (!category && subcategory) {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id,name")
      .eq("id", subcategory.category_id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return commerceError("INVALID_TAXONOMY", "La categoría de la subcategoría no es válida.");
    category = data as CategoryRow;
  }

  return { category, subcategory };
}

function buildSearchAttempts(taxonomy: TaxonomySelection): TaxonomySelection[] {
  const attempts: TaxonomySelection[] = [taxonomy];
  if (taxonomy.category && taxonomy.subcategory) attempts.push({ category: taxonomy.category });
  if (taxonomy.category || taxonomy.subcategory) attempts.push({});
  return attempts;
}

async function fetchProductRelations(
  taxonomy: TaxonomySelection,
  productId?: string
): Promise<ProductRelationRow[] | ToolResult> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  let query = supabase.from("products").select("id,category_id,subcategory_id");
  if (productId) query = query.eq("id", productId);
  if (taxonomy.category) query = query.eq("category_id", taxonomy.category.id);
  if (taxonomy.subcategory) query = query.eq("subcategory_id", taxonomy.subcategory.id);
  const { data, error } = await query.limit(250);
  if (error) return commerceError("INTERNAL_ERROR", "No se pudo consultar la clasificación de productos.");
  return (data as ProductRelationRow[] | null) ?? [];
}

async function fetchProductDetails(input: {
  productIds: string[];
  requestedProductId?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ProductDetailsRow[] | ToolResult> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  let query = supabase.from("product_details").select(PRODUCT_COLUMNS).gt("stock", 0);
  if (input.productIds.length > 0) query = query.in("id", input.productIds);
  if (input.requestedProductId) query = query.eq("id", input.requestedProductId);
  if (input.minPrice !== undefined) query = query.gte("price", input.minPrice);
  if (input.maxPrice !== undefined) query = query.lte("price", input.maxPrice);
  const { data, error } = await query.limit(250);
  if (error) return commerceError("INTERNAL_ERROR", "Error al buscar productos.");
  return (data as ProductDetailsRow[] | null) ?? [];
}

async function fetchEnrichedProduct(productId: string): Promise<Product | ToolResult> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");

  const [{ data: detail, error: detailError }, { data: relation, error: relationError }] =
    await Promise.all([
      supabase.from("product_details").select(PRODUCT_COLUMNS).eq("id", productId).maybeSingle(),
      supabase.from("products").select("id,category_id,subcategory_id").eq("id", productId).maybeSingle(),
    ]);

  if (detailError || relationError) return commerceError("INTERNAL_ERROR", "No se pudo validar el producto.");
  if (!detail) return commerceError("PRODUCT_NOT_FOUND", "Producto no encontrado o inactivo.");
  if (!relation) return commerceError("INVALID_TAXONOMY", "El producto no tiene una clasificación válida.");

  const product = mapProductDetails(detail as ProductDetailsRow);
  if (!product) return commerceError("PRODUCT_NOT_FOUND", "Producto no válido.");
  const relationMap = new Map([[productId, relation as ProductRelationRow]]);
  const taxonomyMaps = await loadTaxonomyMaps(relationMap);
  if ("result" in taxonomyMaps) return taxonomyMaps;
  const productRelation = relation as ProductRelationRow;
  const category = taxonomyMaps.categories.get(productRelation.category_id);
  const subcategory = taxonomyMaps.subcategories.get(productRelation.subcategory_id);
  if (!category || !subcategory || subcategory.category_id !== category.id) {
    return commerceError("INVALID_TAXONOMY", "La clasificación del producto no es válida.");
  }

  return {
    ...product,
    categoryId: category.id,
    category: category.name,
    subcategoryId: subcategory.id,
    subcategory: subcategory.name,
  };
}

async function loadTaxonomyMaps(relations: Map<string, ProductRelationRow>): Promise<
  | {
      categories: Map<string, CategoryRow>;
      subcategories: Map<string, SubcategoryRow>;
    }
  | ToolResult
> {
  if (!supabase) return commerceError("DATABASE_UNAVAILABLE", "Base de datos no disponible.");
  const categoryIds = [...new Set([...relations.values()].map((row) => row.category_id))];
  const subcategoryIds = [...new Set([...relations.values()].map((row) => row.subcategory_id))];
  if (categoryIds.length === 0 || subcategoryIds.length === 0) {
    return { categories: new Map(), subcategories: new Map() };
  }

  const [categoryResult, subcategoryResult] = await Promise.all([
    supabase.from("product_categories").select("id,name").in("id", categoryIds),
    supabase.from("product_subcategories").select("id,category_id,name").in("id", subcategoryIds),
  ]);
  if (categoryResult.error || subcategoryResult.error) {
    return commerceError("INTERNAL_ERROR", "No se pudo cargar la clasificación de productos.");
  }

  const categories = ((categoryResult.data as CategoryRow[] | null) ?? []).map((row) => [row.id, row] as const);
  const subcategories = ((subcategoryResult.data as SubcategoryRow[] | null) ?? []).map((row) => [row.id, row] as const);
  return {
    categories: new Map(categories),
    subcategories: new Map(subcategories),
  };
}

function scoreProduct(
  product: Product,
  queryText: string | undefined,
  taxonomy: TaxonomySelection,
  minPrice?: number,
  maxPrice?: number
): number {
  let score = 0;
  if (taxonomy.category && product.categoryId === taxonomy.category.id) score += 30;
  if (taxonomy.subcategory && product.subcategoryId === taxonomy.subcategory.id) score += 30;

  const queryTokens = tokenize(queryText ?? "");
  const nameTokens = tokenize(product.name);
  const descriptionTokens = tokenize(product.description);
  const nameMatches = queryTokens.filter((token) => nameTokens.includes(token)).length;
  const attributeMatches = queryTokens.filter((token) => descriptionTokens.includes(token)).length;
  if (queryTokens.length > 0) {
    score += Math.min(20, (nameMatches / queryTokens.length) * 20);
    score += Math.min(10, (attributeMatches / queryTokens.length) * 10);
  }
  if (
    (minPrice === undefined || product.price >= minPrice) &&
    (maxPrice === undefined || product.price <= maxPrice)
  ) {
    score += 10;
  }
  if (product.featured) score += 2;
  return score;
}

function toToolProduct(product: Product, score?: number) {
  return {
    id: product.id,
    name: product.name,
    category: { id: product.categoryId ?? null, name: product.category },
    subcategory: product.subcategory
      ? { id: product.subcategoryId ?? null, name: product.subcategory }
      : null,
    price: product.price,
    stock: product.stock,
    description: product.description,
    unitOfMeasure: product.weight ?? null,
    ...(score === undefined ? {} : { relevanceScore: Math.round(score) }),
  };
}

function getMatchLevel(attempt: TaxonomySelection, requested: TaxonomySelection): string {
  if (attempt.category && attempt.subcategory) return "category_subcategory";
  if (attempt.category && requested.subcategory) return "category_fallback";
  if (!attempt.category && (requested.category || requested.subcategory)) return "related_fallback";
  return "catalog";
}

function commerceError(code: CommerceErrorCode, message: string): ToolResult {
  return {
    result: {
      success: false,
      error: { code, message },
    },
  };
}

function optionalFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function stringArg(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function tokenize(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}
