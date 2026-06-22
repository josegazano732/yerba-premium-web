"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/Button";

export function ProductCard({ product }: Readonly<{ product: Product }>) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ duration: 0.25 }}
      className="group rounded-[8px] border border-primary/10 bg-white p-3 shadow-sm transition hover:shadow-2xl hover:shadow-primary/10"
    >
      <div className="relative aspect-[4/4.5] overflow-hidden rounded-[6px] bg-secondary/35">
        <Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        {product.discount ? <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">{product.discount}</span> : null}
      </div>
      <div className="p-3">
        <h3 className="font-serif text-xl font-semibold text-text">{product.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{product.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-primary">{product.price}</p>
          <Button href="/productos" className="h-10 min-h-10 px-4">
            <ShoppingBag size={16} />
            <span className="sr-only">Comprar</span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}