"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

type ProductCardProps = {
  product: Product;
  onAdd?: (product: Product) => void;
  onSelect?: (product: Product) => void;
};

export function ProductCard({ product, onAdd, onSelect }: Readonly<ProductCardProps>) {
  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      className="group flex h-full flex-col rounded-[8px] border border-[#d9d4c8] bg-[#fffdf8] p-2 shadow-[0_10px_35px_rgba(37,48,27,0.06)] transition hover:border-primary/30 hover:shadow-[0_18px_45px_rgba(37,48,27,0.12)]"
    >
      <button
        type="button"
        onClick={() => onSelect?.(product)}
        disabled={!onSelect}
        className="text-left disabled:cursor-default"
        aria-label={onSelect ? `Ver detalle de ${product.name}` : undefined}
      >
        <div className="relative aspect-[4/4.3] overflow-hidden rounded-[6px] bg-secondary/35">
          <Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
          {product.discount ? <span className="absolute left-3 top-3 rounded bg-[#20341d] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">{product.discount}</span> : null}
        </div>
        <div className="px-3 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{product.category}{product.weight ? ` · ${product.weight}` : ""}</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-text transition group-hover:text-primary">{product.name}</h3>
        </div>
      </button>
      <div className="flex flex-1 flex-col px-3 pb-2">
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#e7e2d8] pt-4">
          <div>
            {product.compareAtPrice ? <p className="text-xs text-muted line-through">{currency.format(product.compareAtPrice)}</p> : null}
            <p className="text-lg font-extrabold text-[#20341d]">{currency.format(product.price)}</p>
          </div>
          {onAdd ? (
            <button
              type="button"
              onClick={() => onAdd(product)}
              className="group/add inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-cta px-3 text-white transition-all duration-300 hover:bg-cta-hover focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <ShoppingBag size={16} className="shrink-0" />
              <span
                aria-hidden
                className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 group-focus-visible/add:ml-2 group-focus-visible/add:max-w-24 group-focus-visible/add:opacity-100"
              >
                Agregar
              </span>
            </button>
          ) : (
            <Button href="/productos" className="h-10 min-h-10 px-4">
              <ShoppingBag size={16} />
              <span className="sr-only">Comprar</span>
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}