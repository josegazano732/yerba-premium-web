"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";

const CATEGORY_ORDER = ["Mates", "Termos", "Bombillas", "Yerberas", "Materas", "Combos Ofertas"];

export function CategoryShowcase() {
  const { products, categories, isLoading } = useCatalog();

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
      .slice(0, 8);
  }, [categories, products]);

  if (!isLoading && cards.length === 0) return null;

  return (
    <section className="section-pad bg-background">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <Badge>Explora por categoria</Badge>
            <h2 className="mt-4 font-serif text-3xl text-[#20341d] sm:text-4xl">
              Encontra exactamente lo que tu mate necesita
            </h2>
            <p className="mt-3 text-base text-muted">
              Desde el mate de todos los dias hasta el termo que aguanta la jornada completa.
            </p>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
          >
            Ver todo el catalogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-3xl bg-secondary/40" />
              ))
            : cards.map((card, index) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
                >
                  <Link
                    href={`/productos#${encodeURIComponent(card.name)}`}
                    className="group relative flex aspect-[4/5] overflow-hidden rounded-3xl bg-secondary/30 ring-1 ring-primary/10 transition duration-300 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                      className="object-cover transition duration-700 group-hover:scale-110"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <span className="relative mt-auto w-full p-4">
                      <span className="block font-serif text-xl text-white">{card.name}</span>
                      {card.count > 0 && (
                        <span className="mt-1 block text-xs font-medium text-white/80">{card.count} productos</span>
                      )}
                    </span>
                  </Link>
                </motion.div>
              ))}
        </div>
      </Container>
    </section>
  );
}
