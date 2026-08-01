"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { featuredProducts as fallbackFeatured, Product } from "@/data/products";
import { useCatalog } from "@/lib/useCatalog";
import { ProductCard } from "./ProductCard";

const FEATURED_PRIORITY = ["Mates", "Combos Ofertas", "Termos", "Bombillas"];
const AUTOPLAY_MS = 5000;

export function FeaturedProducts() {
  const { products, isLoading } = useCatalog();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const selection = useMemo<Product[]>(() => {
    if (products.length === 0) return fallbackFeatured;

    const inStock = products.filter((product) => product.stock > 0);
    const pool = inStock.length > 0 ? inStock : products;

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
      if (selected.length === 10) break;
    }

    return selected;
  }, [products]);

  useEffect(() => {
    if (isPaused || selection.length < 3) return;

    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const card = track.firstElementChild as HTMLElement | null;
      const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;

      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 8) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      track.scrollBy({ left: step, behavior: "smooth" });
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, selection.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <section className="section-pad bg-white/60">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <Badge>Los mas elegidos</Badge>
            <h2 className="mt-4 font-serif text-3xl text-[#20341d] sm:text-4xl">Favoritos de la comunidad matera</h2>
            <p className="mt-3 text-base text-muted">
              Seleccion actualizada con lo que mas sale de nuestro deposito. Stock real, listo para despachar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label="Ver productos anteriores"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary ring-1 ring-primary/15 transition hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Ver productos siguientes"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary ring-1 ring-primary/15 transition hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[26rem] w-[16rem] shrink-0 animate-pulse snap-start rounded-[8px] bg-secondary/40 sm:w-[18rem]"
                />
              ))
            : selection.map((product) => (
                <div key={product.id} className="w-[16rem] shrink-0 snap-start sm:w-[18rem]">
                  <ProductCard product={product} />
                </div>
              ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button href="/productos" className="px-7 py-3 text-base">
            {products.length > 0 ? `Ver los ${products.length} productos` : "Ver todo el catalogo"}
          </Button>
        </div>
      </Container>
    </section>
  );
}