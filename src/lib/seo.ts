import { site } from "@/data/site";

export const SITE_NAME = "Mate Tierra";

/** Genera el title de la página: "Nombre | Mate Tierra" o el default de la tienda. */
export function buildTitle(pageTitle?: string): string {
  if (!pageTitle) return `${SITE_NAME} | Mates, Termos, Bombillas y Accesorios`;
  return `${pageTitle} | ${SITE_NAME}`;
}

/** Convierte un texto en slug URL-amigable. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** URL canónica de un producto. */
export function productUrl(name: string): string {
  return `/productos/${slugify(name)}`;
}

/** URL canónica de una categoría. */
export function categoryUrl(name: string): string {
  return `/categorias/${slugify(name)}`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: site.baseUrl,
    logo: `${site.baseUrl}/logo.png`,
    sameAs: [site.instagramUrl],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${site.whatsappNumber}`,
      contactType: "customer service",
      areaServed: "AR",
      availableLanguage: "Spanish"
    }
  };
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: site.baseUrl
  };
}

export function buildStoreSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: SITE_NAME,
    url: site.baseUrl,
    description:
      "Tienda online de mates, termos, bombillas, yerberas y accesorios materos con envío a todo el país desde Misiones, Argentina.",
    currenciesAccepted: "ARS",
    paymentAccepted: site.paymentMethods.join(", "),
    areaServed: "AR",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Apóstoles",
      addressRegion: "Misiones",
      addressCountry: "AR"
    }
  };
}

export function buildProductSchema(product: {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${site.baseUrl}${productUrl(product.name)}`,
      priceCurrency: "ARS",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME }
    }
  };
}

export function buildItemListSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url
    }))
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
