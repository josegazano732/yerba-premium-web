"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Package, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useKitBuilderState } from "./KitBuilderState";

export function KitBuilderScene() {
  const { items, itemCount, removeItem } = useKitBuilderState();
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="kit-builder-scene-heading"
      className="overflow-hidden rounded-[8px] border border-primary/10 bg-white p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="kit-builder-scene-heading" className="font-serif text-2xl text-forest">
            Vista previa del kit
          </h2>
          <p className="mt-1 text-sm text-muted">
            Asi se ve tu combinacion mientras elegis los productos.
          </p>
        </div>
        {itemCount > 0 ? (
          <span className="shrink-0 rounded-full bg-secondary/40 px-3 py-1 text-xs font-bold text-primary">
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
          </span>
        ) : null}
      </div>

      <div className="grain mt-5 flex min-h-[240px] items-center justify-center rounded-[10px] border border-primary/10 bg-[linear-gradient(180deg,rgba(247,242,234,0.6),rgba(216,196,166,0.28))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_40px_rgba(37,48,27,0.06)] sm:min-h-[300px] sm:p-6">
        {items.length === 0 ? (
          <div className="grid place-items-center gap-3 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-primary/20 bg-white/70 text-primary shadow-sm">
              <Package className="h-6 w-6" />
            </span>
            <div>
              <p className="font-serif text-xl text-forest">Tu kit esta vacio</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Agrega productos desde el selector para armar la vista previa de tu ronda.
              </p>
            </div>
          </div>
        ) : (
          <motion.ul layout className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
            <AnimatePresence initial={false}>
              {items.map(({ product, quantity }) => (
                <motion.li
                  key={product.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="group relative w-[132px] overflow-hidden rounded-[10px] border border-primary/10 bg-white p-2 shadow-[0_10px_28px_rgba(37,48,27,0.12)] sm:w-[150px]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[7px] bg-secondary/25">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="150px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    {quantity > 1 ? (
                      <span className="absolute right-1.5 top-1.5 grid min-w-6 place-items-center rounded-full bg-forest px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        ×{quantity}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    aria-label={`Quitar ${product.name} del kit`}
                    className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-forest opacity-0 shadow-sm transition hover:bg-white hover:text-cta-hover focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="mt-2">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-forest">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{formatPrice(product.price * quantity)}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
