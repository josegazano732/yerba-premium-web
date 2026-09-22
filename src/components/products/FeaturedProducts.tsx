"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { featuredProducts as fallbackFeatured, Product } from "@/data/products";
import { useCatalog } from "@/lib/useCatalog";
import { ProductCard } from "./ProductCard";

const FEATURED_PRIORITY = ["Mates", "Termos", "Bombillas", "Materas"];
const EXCLUDED_CATEGORY_KEYWORDS = ["pequen", "combo", "hierba"];
const EDITORIAL_FORMATS = [
  "portrait",
  "landscape",
  "standard",
  "portrait",
  "landscape",
  "portrait",
  "landscape",
  "standard",
  "standard",
  "landscape",
  "portrait",
  "landscape"
] as const;

/** Compara sin acentos ni mayusculas para tolerar variantes de nombre en el catalogo. */
function isExcludedCategory(category: string) {
  const normalized = category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return EXCLUDED_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function FeaturedProducts() {
  const { products, isLoading } = useCatalog();

  const selection = useMemo<Product[]>(() => {
    const allowed = products.filter((product) => !isExcludedCategory(product.category));
    if (allowed.length === 0) return fallbackFeatured.filter((product) => !isExcludedCategory(product.category));

    const inStock = allowed.filter((product) => product.stock > 0);
    const pool = inStock.length > 0 ? inStock : allowed;

    const ranked = [...pool].sort((first, second) => {
      const featuredDiff = Number(second.featured) - Number(first.featured);
      if (featuredDiff !== 0) return featuredDiff;
      const rankA = FEATURED_PRIORITY.indexOf(first.category);
      const rankB = FEATURED_PRIORITY.indexOf(second.category);
      return (rankA === -1 ? FEATURED_PRIORITY.length : rankA) - (rankB === -1 ? FEATURED_PRIORITY.length : rankB);
    });

    // Limita repeticiones por categoria para que la vitrina se vea variada.
    const perCategory = new Map<string, number>();
    const selected: Product[] = [];

    for (const product of ranked) {
      const used = perCategory.get(product.category) ?? 0;
      if (used >= 3) continue;
      perCategory.set(product.category, used + 1);
      selected.push(product);
      if (selected.length === 12) break;
    }

    return selected;
  }, [products]);

  return (
    <section className="section-pad bg-white/60" aria-labelledby="featured-products-title">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge>Los mas elegidos</Badge>
          <h2 id="featured-products-title" className="mt-4 font-serif text-3xl text-[#20341d] sm:text-4xl">
            Favoritos de la comunidad matera
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Una selección pensada para acompañar cada momento del ritual matero.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 items-start gap-x-5 gap-y-7 pb-8 sm:mt-11 sm:grid-cols-2 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4 xl:gap-y-12 xl:pb-14">
          {isLoading
            ? Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className={`animate-pulse rounded-[8px] border border-primary/5 bg-secondary/30 ${
                    EDITORIAL_FORMATS[index] === "portrait"
                      ? "aspect-[4/6.9]"
                      : EDITORIAL_FORMATS[index] === "landscape"
                        ? "aspect-[4/5.1]"
                        : "aspect-[4/6]"
                  } ${index % 4 === 1 || index % 4 === 3 ? "xl:translate-y-10" : ""}`}
                />
              ))
            : selection.map((product, index) => (
                <div
                  key={product.id}
                  className={index % 4 === 1 || index % 4 === 3 ? "xl:translate-y-10" : undefined}
                >
                  <ProductCard product={product} imageFormat={EDITORIAL_FORMATS[index]} />
                </div>
              ))}
        </div>

        <div className="mt-4 flex justify-center sm:mt-8">
          <Button href="/productos" className="px-7 py-3 text-base">
            {products.length > 0 ? `Ver los ${products.length} productos` : "Ver todo el catalogo"}
          </Button>
        </div>
      </Container>
    </section>
  );
}