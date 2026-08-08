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

export function ProductMarquee() {
  const { products } = useCatalog();

  const ALLOWED_CATEGORIES = ["Termos", "Mates", "Materas", "Calcomanias", "Bombillas"];

  const items = useMemo(() => {
    if (products.length === 0) {
      return fallbackImages.map((image, index) => ({ id: `fallback-${index}`, name: "Yerba Libre", image }));
    }

    const filtered = products.filter((p) => ALLOWED_CATEGORIES.includes(p.category));

    const byCategory = new Map<string, typeof products>();
    for (const product of filtered) {
      const bucket = byCategory.get(product.category) ?? [];
      bucket.push(product);
      byCategory.set(product.category, bucket);
    }

    // Intercala categorias para que la cinta muestre imagenes variadas.
    const buckets = Array.from(byCategory.values());
    const mixed: typeof products = [];
    for (let round = 0; mixed.length < 16; round += 1) {
      const added = buckets.filter((bucket) => bucket[round]).map((bucket) => bucket[round]);
      if (added.length === 0) break;
      mixed.push(...added);
    }

    return mixed.slice(0, 16).map((product) => ({ id: product.id, name: product.name, image: product.image }));
  }, [products]);

  const loop = [...items, ...items];

  return (
    <section className="overflow-hidden border-y border-primary/10 bg-white/70 py-8" aria-label="Galeria de productos">
      <motion.div
        className="flex w-max gap-4 sm:gap-6"
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
