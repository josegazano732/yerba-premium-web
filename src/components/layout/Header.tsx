"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Mail, Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { useCatalog } from "@/lib/useCatalog";
import { formatPrice } from "@/lib/utils";
import { MobileMenu } from "./MobileMenu";

const navItems = [
  { href: "/donde-comprar", label: "Donde Comprar" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
  { href: "/contacto", label: "Contacto" }
];

const CATEGORY_ORDER = ["Mates", "Termos", "Bombillas", "Yerberas", "Materas", "Combos Ofertas"];

const CATEGORY_COPY: Record<string, string> = {
  Mates: "Calabaza, madera y acero para cada estilo de ronda.",
  Termos: "Modelos termicos que sostienen la temperatura ideal.",
  Bombillas: "Acero y alpaca con filtros que no se tapan.",
  Yerberas: "Recipientes hermeticos para conservar el sabor.",
  Materas: "Bolsos y estuches para llevar el equipo completo.",
  "Combos Ofertas": "Sets listos para arrancar el ritual o regalar."
};

const fallbackSections = ["Mates", "Termos", "Bombillas"].map((name) => ({
  title: name,
  description: CATEGORY_COPY[name],
  href: `/productos#${encodeURIComponent(name)}`,
  count: 0
}));

const visualFallbackCards = [
  {
    id: "fallback-mates",
    name: "Mates",
    description: "Coleccion seleccionada para tu ritual diario.",
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80",
    href: "/productos#Mates",
    badge: "Categoria destacada"
  },
  {
    id: "fallback-termos",
    name: "Termos",
    description: "Modelos termicos para mantener la temperatura ideal.",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
    href: "/productos#Termos",
    badge: "Categoria destacada"
  }
];

const announcements = [
  "Envios a todo el pais",
  `Envio gratis superando los ${formatPrice(FREE_SHIPPING_THRESHOLD)}`
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const productsMenuRef = useRef<HTMLDivElement | null>(null);
  const announcementLoop = Array.from({ length: 6 }).flatMap(() => announcements);
  const { products, categories } = useCatalog();

  const rankedCategories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((accumulator, product) => {
      accumulator[product.category] = (accumulator[product.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return categories
      .map((category) => ({
        name: category.name,
        image: category.image_url,
        count: counts[category.name] ?? 0
      }))
      .sort((first, second) => {
        const rankA = CATEGORY_ORDER.indexOf(first.name);
        const rankB = CATEGORY_ORDER.indexOf(second.name);
        return (rankA === -1 ? CATEGORY_ORDER.length : rankA) - (rankB === -1 ? CATEGORY_ORDER.length : rankB);
      });
  }, [categories, products]);

  const productSections = useMemo(() => {
    if (rankedCategories.length === 0) return fallbackSections;

    return rankedCategories.slice(0, 5).map((category) => ({
      title: category.name,
      description: CATEGORY_COPY[category.name] ?? "Seleccion curada para completar tu ritual.",
      href: `/productos#${encodeURIComponent(category.name)}`,
      count: category.count
    }));
  }, [rankedCategories]);

  const featuredCards = useMemo(() => {
    const withImage = rankedCategories.filter((category) => Boolean(category.image));
    if (withImage.length === 0) return visualFallbackCards;

    return withImage.slice(0, 2).map((category) => ({
      id: category.name,
      name: category.name,
      description: CATEGORY_COPY[category.name] ?? "Seleccion curada para completar tu ritual.",
      image: category.image as string,
      href: `/productos#${encodeURIComponent(category.name)}`,
      badge: "Categoria destacada"
    }));
  }, [rankedCategories]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setIsProductsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProductsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl">
      <div className="relative overflow-hidden border-y border-primary/15">
        <div className="grain pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <motion.div
          className="relative flex w-max items-center gap-12 py-2.5"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 32, ease: "linear", repeat: Infinity }}
        >
          {announcementLoop.map((message, index) => (
            <span
              key={`${message}-${index}`}
              aria-hidden={index >= announcements.length}
              className="whitespace-nowrap text-xs font-semibold tracking-wide text-forest/80 sm:text-sm"
            >
              {message}
            </span>
          ))}
        </motion.div>
      </div>

      <Container className="relative z-20 grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 lg:hidden"
            aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            <div
              className="relative"
              ref={productsMenuRef}
              onMouseEnter={() => setIsProductsOpen(true)}
              onMouseLeave={() => setIsProductsOpen(false)}
              onFocus={() => setIsProductsOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsProductsOpen(false);
                }
              }}
            >
              <Link
                href="/productos"
                className="font-serif text-lg font-semibold text-forest transition hover:text-primary"
                aria-expanded={isProductsOpen}
                aria-controls="products-mega-menu"
                onClick={() => setIsProductsOpen(false)}
              >
                Productos
              </Link>

              <AnimatePresence>
                {isProductsOpen ? (
                  <motion.div
                    id="products-mega-menu"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 top-full w-[min(960px,calc(100vw-2rem))] pt-4"
                  >
                    <div className="overflow-hidden rounded-[32px] border border-primary/15 bg-[#f8f2e7] shadow-[0_30px_90px_rgba(32,52,29,0.16)]">
                    <div className="grid gap-6 p-6 xl:grid-cols-[0.95fr_1.05fr] xl:gap-8 xl:p-8">
                      <div className="grid content-start gap-6">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Productos</p>
                        </div>

                        <div className="grid gap-2">
                          {productSections.map((section) => (
                            <Link
                              key={section.title}
                              href={section.href}
                              onClick={() => setIsProductsOpen(false)}
                              className="group flex items-start justify-between gap-4 rounded-2xl border border-transparent px-4 py-3 transition hover:border-primary/10 hover:bg-white/70"
                            >
                              <span>
                                <span className="block font-serif text-xl text-forest transition group-hover:text-primary">
                                  {section.title}
                                </span>
                                <span className="mt-1 block text-sm leading-6 text-muted">{section.description}</span>
                              </span>
                              {section.count > 0 ? (
                                <span className="mt-1 shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                                  {section.count}
                                </span>
                              ) : null}
                            </Link>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <Link
                            href="/productos"
                            onClick={() => setIsProductsOpen(false)}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-bold text-white transition hover:bg-primary"
                          >
                            Ver catalogo completo
                          </Link>
                          <Link
                            href={productSections[0]?.href ?? "/productos"}
                            onClick={() => setIsProductsOpen(false)}
                            className="inline-flex h-11 items-center justify-center rounded-full border border-primary/20 bg-white/70 px-5 text-sm font-bold text-forest transition hover:border-primary hover:bg-white"
                          >
                            Ver {(productSections[0]?.title ?? "productos").toLowerCase()}
                          </Link>                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {featuredCards.map((product) => (
                          <Link
                            key={product.id}
                            href={product.href}
                            onClick={() => setIsProductsOpen(false)}
                            className="group relative overflow-hidden rounded-[28px] bg-[#eadfcd] shadow-[0_18px_40px_rgba(32,52,29,0.08)]"
                          >
                            <div className="relative aspect-[4/5]">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, 240px"
                                className="object-cover transition duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#182216]/78 via-transparent to-transparent" />
                              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                                  {product.badge}
                                </p>
                                <p className="mt-1 font-serif text-2xl leading-tight">{product.name}</p>
                                <p className="mt-2 text-sm leading-6 text-white/82">{product.description}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-serif text-lg font-semibold text-forest transition hover:text-primary"
                onClick={() => setIsProductsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="flex items-center justify-center" aria-label="Inicio">
          <BrandLogo />
        </Link>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Link
            href="/productos"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary"
            aria-label="Buscar productos"
          >
            <Search size={20} />
          </Link>
          <Link
            href="/contacto"
            className="hidden h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary sm:grid"
            aria-label="Contacto"
          >
            <Mail size={20} />
          </Link>
          <Link
            href="/productos"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary"
            aria-label="Ir a la tienda"
          >
            <ShoppingBag size={20} />
          </Link>
        </div>

        <AnimatePresence>{isOpen ? <MobileMenu onNavigate={() => setIsOpen(false)} /> : null}</AnimatePresence>
      </Container>
    </header>
  );
}