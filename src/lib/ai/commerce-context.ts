export type PurchaseIntent = "low" | "medium" | "high" | "very_high";

export type ConversationState =
  | "DISCOVERY"
  | "SEARCH"
  | "CONSIDERATION"
  | "PURCHASE_INTENT"
  | "CART"
  | "CHECKOUT"
  | "HUMAN_HANDOFF"
  | "END";

export type CommerceCartItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
};

export type CommerceContext = {
  state: ConversationState;
  intent?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  productId?: string;
  variantId?: string;
  currentProductId?: string;
  quantity?: number;
  budget?: number;
  useCase?: string;
  occasion?: string;
  recipient?: string;
  preferences: string[];
  rejectedProductIds: string[];
  recommendedProductIds: string[];
  lastSelectedProductId?: string;
  purchaseIntent: PurchaseIntent;
  cart: {
    total: number;
    items: CommerceCartItem[];
    categoriesInCart: string[];
    isReadyForCheckout: boolean;
    complementaryCategories: string[];
  };
};

export type CommerceTaxonomy = {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
};

type ContextCartInput = CommerceCartItem & {
  unitPrice: number;
};

type UpdateContextInput = {
  previous?: CommerceContext;
  message: string;
  currentProductId?: string;
  cart: ContextCartInput[];
  categories?: CommerceTaxonomy[];
  subcategories?: CommerceTaxonomy[];
};

const CATEGORY_HINTS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /\b(bombillas?|bombillones?)\b/i, category: "Bombillas" },
  { pattern: /\b(materas?|mochila matera|morral matero|canasta matera)\b/i, category: "Materas" },
  { pattern: /\b(termos?|media manija)\b/i, category: "Termos" },
  { pattern: /\b(botellas? termicas?|vasos? termicos?|termolares?|autocebante)\b/i, category: "Térmico" },
  { pattern: /\b(yerberas?)\b/i, category: "Yerberas" },
  { pattern: /\b(hierbas?|hibiscus|flores?|te verde|te rojo|menta|burrito)\b/i, category: "Hierbas" },
  { pattern: /\b(camionero|imperial|torpedo|galleta)\b/i, category: "Mates" },
];

const SUBCATEGORY_HINTS: Array<{ pattern: RegExp; category: string; subcategory: string }> = [
  { pattern: /\bcamionero\b/i, category: "Mates", subcategory: "Camionero" },
  { pattern: /\bimperial\b/i, category: "Mates", subcategory: "Imperial" },
  { pattern: /\btorpedo\b/i, category: "Mates", subcategory: "Torpedo" },
  { pattern: /\bmate(?:s)?\s+(?:de\s+)?algarrobo\b/i, category: "Mates", subcategory: "Algarrobo" },
  { pattern: /\bbombilla(?:s)?\s+(?:de\s+)?acero\b/i, category: "Bombillas", subcategory: "Acero" },
  { pattern: /\bbombilla(?:s)?\s+(?:de\s+)?alpaca\b/i, category: "Bombillas", subcategory: "Alpaca" },
  { pattern: /\b(mochila matera|matera mochila)\b/i, category: "Materas", subcategory: "Mochilas" },
  { pattern: /\b(morral|bolso matero)\b/i, category: "Materas", subcategory: "Morrales" },
  { pattern: /\bmedia manija\b/i, category: "Termos", subcategory: "Media manija" },
  { pattern: /\bbotella(?:s)? termica(?:s)?\b/i, category: "Térmico", subcategory: "Botellas térmicas" },
  { pattern: /\bvaso(?:s)? termico(?:s)?\b/i, category: "Térmico", subcategory: "Vasos térmicos" },
  { pattern: /\bautocebante\b/i, category: "Térmico", subcategory: "Mates autocebantes" },
];

const COMPLEMENTS: Record<string, string[]> = {
  Mates: ["Bombillas", "Hierbas"],
  Bombillas: ["Mates", "Hierbas"],
  Termos: ["Mates", "Bombillas"],
  Materas: ["Mates", "Termos", "Bombillas"],
  Hierbas: ["Mates", "Bombillas"],
};

export function createCommerceContext(): CommerceContext {
  return {
    state: "DISCOVERY",
    preferences: [],
    rejectedProductIds: [],
    recommendedProductIds: [],
    purchaseIntent: "low",
    cart: {
      total: 0,
      items: [],
      categoriesInCart: [],
      isReadyForCheckout: false,
      complementaryCategories: [],
    },
  };
}

export function updateCommerceContext({
  previous,
  message,
  currentProductId,
  cart,
  categories,
  subcategories,
}: UpdateContextInput): CommerceContext {
  const context = previous ?? createCommerceContext();
  const normalized = normalizeText(message);
  const taxonomy = detectTaxonomy(message, categories, subcategories);
  const isYerbaMateIntent = isYerbaMateSearch(normalized);
  const budget = extractBudget(normalized);
  const quantity = extractQuantity(normalized);
  const purchaseIntent = detectPurchaseIntent(normalized);
  const categoriesInCart = [...new Set(cart.map((item) => item.categoryName).filter((value): value is string => Boolean(value)))];
  const isReadyForCheckout = ["Mates", "Bombillas", "Termos", "Hierbas"].every((category) =>
    categoriesInCart.includes(category)
  );
  const complementaryCategories = isReadyForCheckout
    ? []
    : getComplementaryCategories(categoriesInCart);
  const resolvedProductId = resolveContextualProductId(message, {
    ...context,
    currentProductId: currentProductId ?? context.currentProductId,
  });

  return {
    ...context,
    state: detectConversationState(normalized, purchaseIntent, cart.length > 0, Boolean(taxonomy)),
    intent: message.trim(),
    categoryId: taxonomy?.categoryId ?? (isYerbaMateIntent ? undefined : context.categoryId),
    categoryName: taxonomy?.category ?? (isYerbaMateIntent ? undefined : context.categoryName),
    subcategoryId: taxonomy?.subcategoryId ?? (isYerbaMateIntent ? undefined : context.subcategoryId),
    subcategoryName: taxonomy?.subcategory ?? (isYerbaMateIntent ? undefined : context.subcategoryName),
    currentProductId: currentProductId ?? context.currentProductId,
    productId: resolvedProductId ?? context.productId,
    lastSelectedProductId: resolvedProductId ?? context.lastSelectedProductId,
    quantity: quantity ?? context.quantity,
    budget: budget ?? context.budget,
    purchaseIntent,
    cart: {
      total: cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        subcategoryId: item.subcategoryId,
        subcategoryName: item.subcategoryName,
      })),
      categoriesInCart,
      isReadyForCheckout,
      complementaryCategories,
    },
  };
}

export function withRecommendedProducts(
  context: CommerceContext,
  productIds: string[]
): CommerceContext {
  const uniqueIds = [...new Set(productIds)].slice(0, 8);
  if (uniqueIds.length === 0) return context;

  return {
    ...context,
    recommendedProductIds: uniqueIds,
  };
}

export function resolveContextualProductId(
  message: string,
  context: Pick<
    CommerceContext,
    "currentProductId" | "lastSelectedProductId" | "recommendedProductIds"
  >
): string | undefined {
  const normalized = normalizeText(message);
  const ordinal = getOrdinalIndex(normalized);

  if (ordinal !== undefined) {
    return context.recommendedProductIds[ordinal];
  }

  if (/\b(ese|esa|eso|este|esta|agregalo|agregala|agrega (?:uno|una|\d+)|comprarlo|comprarla|quiero (?:uno|dos|tres))\b/.test(normalized)) {
    return (
      context.currentProductId ??
      context.lastSelectedProductId ??
      context.recommendedProductIds.at(-1)
    );
  }

  return context.lastSelectedProductId;
}

export function detectTaxonomy(
  message: string,
  categories?: CommerceTaxonomy[],
  subcategories?: CommerceTaxonomy[]
): { category: string; categoryId?: string; subcategory?: string; subcategoryId?: string } | undefined {
  const normalized = normalizeText(message);
  const matchedSubcategories = (subcategories ?? [])
    .filter((subcategory) => containsPhrase(normalized, subcategory.name))
    .sort((left, right) => right.name.length - left.name.length);
  const matchedCategories = (categories ?? [])
    .filter((category) => containsPhrase(normalized, category.name))
    .sort((left, right) => right.name.length - left.name.length);
  const isYerbaMateQuery = /\byerba(?:s)?\s+mate(?:s)?\b/.test(normalized);

  const relevantSubcategories = matchedSubcategories.filter((subcategory) => {
    if (!isYerbaMateQuery) return true;
    const parent = categories?.find((category) => category.id === subcategory.categoryId);
    return (
      normalizeText(subcategory.name).includes("yerba") ||
      normalizeText(subcategory.categoryName ?? parent?.name ?? "").includes("yerba")
    );
  });

  if (relevantSubcategories.length > 0) {
    const explicitlyMatched = matchedCategories[0];
    const subcategory = relevantSubcategories.find(
      (candidate) => !explicitlyMatched || candidate.categoryId === explicitlyMatched.id
    );
    const unambiguous = subcategory ?? (relevantSubcategories.length === 1 ? relevantSubcategories[0] : undefined);
    if (unambiguous) {
      const parent = categories?.find((category) => category.id === unambiguous.categoryId);
      return {
        category: parent?.name ?? unambiguous.categoryName ?? explicitlyMatched?.name ?? "",
        ...(parent?.id || explicitlyMatched?.id
          ? { categoryId: parent?.id ?? explicitlyMatched?.id }
          : {}),
        subcategory: unambiguous.name,
        subcategoryId: unambiguous.id,
      };
    }
  }

  const relevantCategory = matchedCategories.find(
    (category) => !isYerbaMateQuery || normalizeText(category.name).includes("yerba")
  );
  if (relevantCategory) {
    return { category: relevantCategory.name, categoryId: relevantCategory.id };
  }

  const subcategory = SUBCATEGORY_HINTS.find(({ pattern }) => pattern.test(normalized));
  if (subcategory) {
    return { category: subcategory.category, subcategory: subcategory.subcategory };
  }

  const category = CATEGORY_HINTS.find(({ pattern }) => pattern.test(normalized));
  return category ? { category: category.category } : undefined;
}

export function isYerbaMateProduct(name: string): boolean {
  const normalizedName = normalizeText(name);
  const nameTokens = new Set(normalizedName.split(/[^a-z0-9]+/).filter(Boolean));
  return (
    nameTokens.has("yerba") ||
    nameTokens.has("mateite") ||
    /\bdon\s+julian\b/.test(normalizedName)
  );
}

function detectConversationState(
  normalized: string,
  purchaseIntent: PurchaseIntent,
  hasCart: boolean,
  hasTaxonomy: boolean
): ConversationState {
  if (/\b(persona|vendedor|asesor|atencion humana|whatsapp)\b/.test(normalized)) return "HUMAN_HANDOFF";
  if (/^(?:no,?\s*)?(?:gracias|eso era todo|listo|nada mas|no necesito nada mas)[.!]?$/.test(normalized)) {
    return "END";
  }
  if (/\b(finalizar|checkout|como (?:compro|pago|hago el pedido)|donde pago|hacer el pedido)\b/.test(normalized)) {
    return "CHECKOUT";
  }
  if (purchaseIntent === "very_high") return "PURCHASE_INTENT";
  if (/\b(compar|cual (?:es mejor|me recomendas)|recomenda)\b/.test(normalized)) return "CONSIDERATION";
  if (hasTaxonomy || isWholesaleSearch(normalized) || isYerbaMateSearch(normalized)) return "SEARCH";
  if (hasCart) return "CART";
  return "DISCOVERY";
}

function detectPurchaseIntent(normalized: string): PurchaseIntent {
  if (/\b(quiero ese|quiero esa|agregalo|agregala|agrega (?:uno|una|\d+)|me llevo|comprarlo|comprarla|sumalo|sumala)\b/.test(normalized)) {
    return "very_high";
  }
  if (/\b(hay stock|cuanto (?:sale|cuesta)|precio|capacidad|mayorista|mayoristas|revendedor|reventa)\b/.test(normalized)) return "high";
  if (/\b(recomenda|cual es mejor|compar)\b/.test(normalized)) return "medium";
  return "low";
}

function isWholesaleSearch(normalized: string): boolean {
  return /\b(mayorista|mayoristas|revendedor|revendedores|reventa|por volumen)\b/.test(normalized);
}

function isYerbaMateSearch(normalized: string): boolean {
  return /\byerba(?:s)?\s+mate(?:s)?\b/.test(normalized);
}

function extractBudget(normalized: string): number | undefined {
  const match = normalized.match(/\b(?:hasta|maximo|menos de)\s*\$?\s*(\d[\d.,]*)\s*(mil|k)?\b/);
  if (!match) return undefined;

  const parsed = Number(match[1].replace(/[.,]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return match[2] ? parsed * 1000 : parsed;
}

function extractQuantity(normalized: string): number | undefined {
  const words: Record<string, number> = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };
  const wordMatch = normalized.match(/\b(uno|una|dos|tres|cuatro)\b/);
  if (wordMatch) return words[wordMatch[1]];

  const digitMatch = normalized.match(/\b(?:quiero|llevo|agrega|suma)\s*(\d+)\b/);
  if (!digitMatch) return undefined;
  const quantity = Number(digitMatch[1]);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : undefined;
}

function getOrdinalIndex(normalized: string): number | undefined {
  if (/\b(primer|primero|primera)\b/.test(normalized)) return 0;
  if (/\b(segundo|segunda)\b/.test(normalized)) return 1;
  if (/\b(tercer|tercero|tercera)\b/.test(normalized)) return 2;
  if (/\b(cuarto|cuarta)\b/.test(normalized)) return 3;
  return undefined;
}

function getComplementaryCategories(categoriesInCart: string[]): string[] {
  const result: string[] = [];
  for (const category of categoriesInCart) {
    for (const complement of COMPLEMENTS[category] ?? []) {
      if (!categoriesInCart.includes(complement) && !result.includes(complement)) {
        result.push(complement);
      }
    }
  }
  return result.slice(0, 3);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function containsPhrase(normalizedText: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  const flexiblePhrase = normalizedPhrase
    .split(/\s+/)
    .map((word) => `${escapeRegExp(word.endsWith("s") ? word.slice(0, -1) : word)}s?`)
    .join("\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${flexiblePhrase}(?=$|[^a-z0-9])`).test(normalizedText);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
