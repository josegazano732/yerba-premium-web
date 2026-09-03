export type WholesaleCatalogConfig = {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
  description: string;
  heroImageUrl: string | null;
  suggestedMarginPercentage: number;
  isActive: boolean;
  displayOrder: number;
};

export type WholesaleMarginProfile = {
  id: string;
  useKey: string;
  useLabel: string;
  suggestedMarginPercentage: number;
  isActive: boolean;
  displayOrder: number;
};

export const VAT_RATE = 0.21;

export const DEFAULT_MARGIN_PROFILES: WholesaleMarginProfile[] = [
  {
    id: "fallback-grandes-cadenas",
    useKey: "grandes-cadenas",
    useLabel: "Grandes cadenas",
    suggestedMarginPercentage: 20,
    isActive: true,
    displayOrder: 1
  },
  {
    id: "fallback-supermercado",
    useKey: "supermercado",
    useLabel: "Supermercado",
    suggestedMarginPercentage: 25,
    isActive: true,
    displayOrder: 2
  },
  {
    id: "fallback-comercio-especializado",
    useKey: "comercio-especializado",
    useLabel: "Comercio especializado",
    suggestedMarginPercentage: 30,
    isActive: true,
    displayOrder: 3
  },
  {
    id: "fallback-dietetica-premium",
    useKey: "dietetica-premium",
    useLabel: "Dietetica / premium",
    suggestedMarginPercentage: 35,
    isActive: true,
    displayOrder: 4
  },
  {
    id: "fallback-productos-diferenciales",
    useKey: "productos-diferenciales",
    useLabel: "Productos diferenciales",
    suggestedMarginPercentage: 40,
    isActive: true,
    displayOrder: 5
  }
];

export const DEFAULT_WHOLESALE_CATALOGS: WholesaleCatalogConfig[] = [
  {
    id: "fallback-hierbas",
    slug: "hierbas",
    title: "Catalogo de Hierbas",
    categoryName: "Hierbas",
    description: "Hierbas serranas, aromaticas y secos fraccionados para revendedores y dieteticas.",
    heroImageUrl: null,
    suggestedMarginPercentage: 30,
    isActive: true,
    displayOrder: 1
  }
];

export function normalizeMarginPercentage(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(90, Math.max(1, Number(value)));
}

export function slugifyCatalog(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "catalogo";
}

export function marginOptionsFromProfiles(profiles: WholesaleMarginProfile[]) {
  const margins = profiles.map((profile) => normalizeMarginPercentage(profile.suggestedMarginPercentage));
  return [...new Set(margins)].sort((a, b) => a - b);
}

export function calculateMarginPricing(purchaseNet: number, marginPercentage: number) {
  const safeMargin = normalizeMarginPercentage(marginPercentage);
  const denominator = 1 - safeMargin / 100;
  const saleNet = denominator > 0 ? purchaseNet / denominator : purchaseNet;
  const vat = saleNet * VAT_RATE;
  const shelfPrice = saleNet + vat;

  return {
    purchaseNet,
    marginPercentage: safeMargin,
    saleNet,
    vat,
    shelfPrice
  };
}
