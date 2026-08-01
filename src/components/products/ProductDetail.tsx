"use client";

import { motion } from "framer-motion";
import { ChevronDown, Truck, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Product } from "@/data/products";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { formatPrice } from "@/lib/utils";

type ProductDetailProps = {
  product: Product;
  related: Product[];
  onAdd: (product: Product, quantity: number) => void;
  onSelect: (product: Product) => void;
  onClose: () => void;
};

export function ProductDetail({ product, related, onAdd, onSelect, onClose }: Readonly<ProductDetailProps>) {
  const gallery = product.images?.length ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setActiveImage(product.images?.[0] ?? product.image);
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6"
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-[#d7d2c7] bg-white transition hover:border-primary" aria-label="Cerrar detalle">
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex gap-4">
            <div className="no-scrollbar flex max-h-[560px] w-20 shrink-0 flex-col gap-3 overflow-y-auto">
              {gallery.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setActiveImage(source)}
                  aria-label="Ver imagen del producto"
                  className={`relative aspect-square w-full overflow-hidden rounded-[6px] border transition ${activeImage === source ? "border-primary" : "border-[#e2ddd3] hover:border-primary/40"}`}
                >
                  <Image src={source} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>

            <div className="relative aspect-square flex-1 overflow-hidden rounded-[8px] bg-secondary/20">
              <Image src={activeImage} alt={product.name} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain" priority />
            </div>
          </div>

          <div>
            <h1 className="font-serif text-3xl font-semibold uppercase leading-tight text-[#20341d] sm:text-4xl">{product.name}</h1>
            {product.compareAtPrice ? <p className="mt-4 text-sm text-muted line-through">{formatPrice(product.compareAtPrice)}</p> : null}
            <p className="mt-2 text-3xl font-extrabold text-[#20341d]">{formatPrice(product.price)}</p>

            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
              <Truck size={18} className="text-primary" />
              <span><strong className="text-[#20341d]">Envío gratis</strong> superando los {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
            </p>

            <div className="mt-6 space-y-3 text-sm leading-7 text-muted">
              <p className="font-semibold text-[#20341d]">{product.category}{product.weight ? ` · ${product.weight}` : ""}</p>
              <p>{product.description}</p>
              {product.stock > 0 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Stock disponible: {product.stock}</p>
              ) : (
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Sin stock — consultanos</p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-20 flex-col items-center justify-center rounded-full border border-[#d7d2c7] bg-white">
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="grid h-5 w-full place-items-center text-muted transition hover:text-primary" aria-label="Agregar uno">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
                <span className="text-sm font-bold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-5 w-full place-items-center text-muted transition hover:text-primary" aria-label="Quitar uno">
                  <ChevronDown size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onAdd(product, quantity)}
                className="h-14 flex-1 rounded-full bg-[#20341d] px-8 text-base font-bold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <div className="mt-20">
            <h2 className="text-center font-serif text-3xl font-semibold text-[#20341d]">Productos similares</h2>
            <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group rounded-[8px] border border-[#d9d4c8] bg-[#fffdf8] p-2 text-left transition hover:border-primary/30"
                >
                  <div className="relative aspect-[4/4.3] overflow-hidden rounded-[6px] bg-secondary/30">
                    <Image src={item.image} alt={item.name} fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 font-serif text-lg leading-tight text-text">{item.name}</p>
                    <p className="mt-2 text-base font-extrabold text-[#20341d]">{formatPrice(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
