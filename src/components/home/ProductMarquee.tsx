"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useCatalog } from "@/lib/useCatalog";

const fallbackImages = [
  "https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1523920290228-4f321a939b4c?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=70"
];

const STICKERS_CATEGORY_ALIASES = ["calcomanias", "stickers"];

function normalizeCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ProductMarquee() {
  const { products } = useCatalog();

  const items = useMemo(() => {
    if (products.length === 0) {
      return fallbackImages.map((image, index) => ({ id: `fallback-${index}`, name: "Yerba Libre", image }));
    }

    const filtered = products.filter((product) => {
      const category = normalizeCategory(product.category);
      return STICKERS_CATEGORY_ALIASES.some((alias) => category.includes(alias));
    });

    if (filtered.length === 0) {
      return fallbackImages.map((image, index) => ({ id: `fallback-${index}`, name: "Calcomanias / Stickers", image }));
    }

    return filtered.flatMap((product) => {
      const gallery = product.images?.length ? product.images : [product.image];
      return gallery.map((image, index) => ({
        id: `${product.id}-${index}`,
        name: product.name,
        image
      }));
    });
  }, [products]);

  const loop = [...items, ...items];

  return (
    <section
      className="relative isolate max-w-full overflow-x-clip border-y border-primary/10 bg-white/70 py-8"
      style={{ contain: "inline-size" }}
      aria-label="Galeria de productos"
    >
      <motion.div
        className="flex w-max will-change-transform gap-4 sm:gap-6"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: Math.max(28, items.length * 3.5), ease: "linear", repeat: Infinity }}
      >
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href="/productos"
            aria-hidden={index >= items.length}
            tabIndex={index >= items.length ? -1 : 0}
            className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary/30 sm:h-36 sm:w-36"
          >
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="144px"
              className="object-cover transition duration-500 group-hover:scale-110"
            />
          </Link>
        ))}
      </motion.div>
    </section>
  );
}
