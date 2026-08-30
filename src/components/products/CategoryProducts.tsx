"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Product } from "@/data/products";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "./ProductCard";

export function CategoryProducts({ products }: Readonly<{ products: Product[] }>) {
  const { addToCart } = useCart();
  const [addedName, setAddedName] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function handleAdd(product: Product) {
    addToCart(product, 1);
    setAddedName(product.name);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setAddedName(null), 2200);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={handleAdd} />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <AnimatePresence>
          {addedName ? (
            <motion.div
              key="added-toast"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-full bg-[#20341d] px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-forest/30"
            >
              <Check size={16} className="shrink-0 text-secondary" aria-hidden />
              <span className="truncate">
                {addedName.length > 28 ? `${addedName.slice(0, 28)}…` : addedName} agregado al carrito
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
