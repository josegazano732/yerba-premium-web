"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";
import { cn, formatPrice } from "@/lib/utils";

const HERO_PRIORITY = ["Mates", "Termos", "Bombillas", "Combos Ofertas", "Materas"];
const ROTATION_MS = 4500;

const fallbackSlides = [
  {
    id: "fallback-1",
    name: "Mate imperial premium",
    category: "Mates",
    price: 0,
    image: "https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "fallback-2",
    name: "Ritual completo",
    category: "Combos",
    price: 0,
    image: "https://images.unsplash.com/photo-1523920290228-4f321a939b4c?auto=format&fit=crop&w=1200&q=80"
  }
];

const trustItems = [
  { icon: Truck, label: "Envios a todo el pais" },
  { icon: ShieldCheck, label: "Compra protegida" },
  { icon: Leaf, label: "Seleccion artesanal" }
];

export function StoreHero() {
  const { products, categories, isLoading } = useCatalog();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => {
    if (products.length === 0) return fallbackSlides;

    const ranked = [...products].sort((a, b) => {
      const rankA = HERO_PRIORITY.indexOf(a.category);
      const rankB = HERO_PRIORITY.indexOf(b.category);
      return (rankA === -1 ? HERO_PRIORITY.length : rankA) - (rankB === -1 ? HERO_PRIORITY.length : rankB);
    });

    const unique: typeof ranked = [];
    const seen = new Set<string>();

    for (const product of ranked) {
      if (seen.has(product.category)) continue;
      seen.add(product.category);
      unique.push(product);
      if (unique.length === 5) break;
    }

    return unique.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image
    }));
  }, [products]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-secondary/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-xl"
        >
          <Badge className="bg-white/80 ring-1 ring-primary/15">Tienda de mate y yerba premium</Badge>

          <h1 className="mt-6 font-serif text-4xl leading-[1.05] text-[#20341d] sm:text-5xl lg:text-6xl">
            Todo para tu ronda de mate, elegido uno por uno
          </h1>

          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Mates, termos, bombillas, yerbas y accesorios de productores que conocemos. Calidad real, precios claros y
            envio a todo el pais para que tu ritual nunca se corte.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="/productos" className="px-7 py-3 text-base">
              Ver la tienda
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button href="/sobre-nosotros" variant="secondary" className="px-7 py-3 text-base">
              Conocer la marca
            </Button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-primary/10 pt-6">
            <div>
              <dt className="sr-only">Productos disponibles</dt>
              <dd className="font-serif text-3xl text-primary">{isLoading ? "--" : `${products.length}+`}</dd>
              <p className="text-xs uppercase tracking-wide text-muted">Productos</p>
            </div>
            <div>
              <dt className="sr-only">Categorias</dt>
              <dd className="font-serif text-3xl text-primary">{isLoading ? "--" : categories.length || "12"}</dd>
              <p className="text-xs uppercase tracking-wide text-muted">Categorias</p>
            </div>
            <div>
              <dt className="sr-only">Valoracion</dt>
              <dd className="font-serif text-3xl text-primary">4.9</dd>
              <p className="text-xs uppercase tracking-wide text-muted">Valoracion</p>
            </div>
          </dl>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {trustItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-[#20341d]">
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem] bg-secondary/40 image-shadow">
            {isLoading ? (
              <div className="absolute inset-0 animate-pulse bg-secondary/50" />
            ) : (
              <AnimatePresence mode="sync">
                <motion.div
                  key={activeSlide?.id ?? "slide"}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={activeSlide?.image ?? fallbackSlides[0].image}
                    alt={activeSlide?.name ?? "Producto destacado"}
                    fill
                    sizes="(max-width: 1024px) 90vw, 420px"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 to-transparent" />

            {!isLoading && (
              <Link
                href="/productos"
                className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white/92 px-4 py-3 backdrop-blur transition hover:bg-white"
              >
                <span className="min-w-0">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-primary">
                    {activeSlide?.category ?? "Destacado"}
                  </span>
                  <span className="block truncate text-sm font-semibold text-[#20341d]">
                    {activeSlide?.name ?? "Descubri la tienda"}
                  </span>
                </span>
                {activeSlide && activeSlide.price > 0 ? (
                  <span className="shrink-0 font-serif text-lg text-primary">{formatPrice(activeSlide.price)}</span>
                ) : (
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
                )}
              </Link>
            )}
          </div>

          {!isLoading && slides.length > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Ver ${slide.name}`}
                  aria-current={index === activeIndex}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === activeIndex ? "w-8 bg-primary" : "w-3 bg-primary/25 hover:bg-primary/50"
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
