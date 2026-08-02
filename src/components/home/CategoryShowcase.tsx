"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";

const CATEGORY_ORDER = ["Mates", "Termos", "Bombillas", "Yerberas", "Materas", "Combos Ofertas"];

export function CategoryShowcase() {
  const { products, categories, isLoading } = useCatalog();
  const trackRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);

  const cards = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((accumulator, product) => {
      accumulator[product.category] = (accumulator[product.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return categories
      .filter((category) => Boolean(category.image_url))
      .map((category) => ({
        name: category.name,
        image: category.image_url as string,
        count: counts[category.name] ?? 0
      }))
      .sort((first, second) => {
        const rankA = CATEGORY_ORDER.indexOf(first.name);
        const rankB = CATEGORY_ORDER.indexOf(second.name);
        return (rankA === -1 ? CATEGORY_ORDER.length : rankA) - (rankB === -1 ? CATEGORY_ORDER.length : rankB);
      })
      .slice(0, 12);
  }, [categories, products]);

  const syncPagination = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const pages = Math.max(1, Math.round(track.scrollWidth / Math.max(track.clientWidth, 1)));
    setPageCount(pages);
    setActivePage(Math.min(pages - 1, Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))));
  }, []);

  useEffect(() => {
    syncPagination();
    window.addEventListener("resize", syncPagination);
    return () => window.removeEventListener("resize", syncPagination);
  }, [cards.length, syncPagination]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const scrollToPage = (page: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: page * track.clientWidth, behavior: "smooth" });
  };

  if (!isLoading && cards.length === 0) return null;

  return (
    <section className="section-pad bg-background">
      <Container>
        <h2 className="text-center font-serif text-3xl font-semibold text-[#20341d] sm:text-4xl">
          Explora por categoria
        </h2>

        <div className="relative mt-10">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Ver categorias anteriores"
            className="absolute -left-1 top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#20341d] text-white shadow-md transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-accent sm:grid lg:-left-4"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={trackRef}
            onScroll={syncPagination}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
          >
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[19rem] w-[60vw] shrink-0 animate-pulse rounded-[8px] bg-secondary/40 sm:w-[15rem]"
                  />
                ))
              : cards.map((card) => (
                  <Link
                    key={card.name}
                    href={`/productos#${encodeURIComponent(card.name)}`}
                    className="group flex w-[60vw] shrink-0 snap-start flex-col overflow-hidden rounded-[8px] bg-white/70 ring-1 ring-primary/10 transition duration-300 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-accent sm:w-[15rem]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-secondary/20">
                      <Image
                        src={card.image}
                        alt={card.name}
                        fill
                        sizes="(max-width: 640px) 60vw, 240px"
                        className="object-cover transition duration-700 group-hover:scale-110"
                      />
                    </div>
                    <div className="border-t border-primary/10 px-4 py-4 text-center">
                      <p className="font-serif text-lg text-[#20341d]">{card.name}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                        {card.count > 0 ? `${card.count} productos` : "Ver seleccion"}
                      </p>
                    </div>
                  </Link>
                ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Ver categorias siguientes"
            className="absolute -right-1 top-[42%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#20341d] text-white shadow-md transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-accent sm:grid lg:-right-4"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {pageCount > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, page) => (
              <button
                key={page}
                type="button"
                onClick={() => scrollToPage(page)}
                aria-label={`Ir al grupo ${page + 1}`}
                aria-current={page === activePage}
                className={`h-2 w-2 rounded-full transition ${page === activePage ? "bg-[#20341d]" : "bg-primary/25"}`}
              />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
