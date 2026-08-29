"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Backpack, Coffee, CupSoda, FlaskConical, Leaf, ShoppingBag, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { categoryUrl } from "@/lib/seo";
import { useCatalog } from "@/lib/useCatalog";

/** Categorías núcleo con acceso directo desde la home. */
const CORE_CATEGORIES = ["Mates", "Termos", "Bombillas", "Materas"];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mates: Coffee,
  termos: FlaskConical,
  bombillas: CupSoda,
  materas: Backpack,
  yerberas: Leaf
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function CategoryQuickLinks() {
  const { products, categories } = useCatalog();

  const counts = products.reduce<Record<string, number>>((accumulator, product) => {
    accumulator[product.category] = (accumulator[product.category] ?? 0) + 1;
    return accumulator;
  }, {});

  const cards = CORE_CATEGORIES.map((name) => {
    const category = categories.find((item) => item.name === name);
    return {
      name,
      href: categoryUrl(name),
      image: category?.image_url ?? "",
      count: counts[name] ?? 0
    };
  });

  return (
    <section className="bg-background pb-4 pt-8 sm:pt-10" aria-labelledby="categorias-heading">
      <Container>
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <Badge>Explorá el catálogo</Badge>
            <h2 id="categorias-heading" className="mt-3 font-serif text-2xl text-forest sm:text-3xl">
              Comprá por categoría
            </h2>
          </div>
          <Link
            href="/productos"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-cta-hover sm:flex"
          >
            Ver todo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = CATEGORY_ICONS[normalize(card.name)] ?? ShoppingBag;
            return (
              <Link
                key={card.name}
                href={card.href}
                className="group relative overflow-hidden rounded-[8px] bg-secondary/20 ring-1 ring-[#e3ddcf] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-forest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-secondary/40 to-secondary/70">
                      <Icon className="h-10 w-10 text-primary sm:h-12 sm:w-12" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="font-semibold text-forest">{card.name}</span>
                  {card.count > 0 && (
                    <span className="shrink-0 text-xs text-muted">
                      {card.count} {card.count === 1 ? "producto" : "productos"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
