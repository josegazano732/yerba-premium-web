"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useKitBuilderState } from "./KitBuilderState";

export function KitBuilderSummary() {
  const { items, total, removeItem, clear, incrementItem, decrementItem } = useKitBuilderState();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddAllToCart() {
    items.forEach((item) => addToCart(item.product, item.quantity));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  return (
    <section aria-labelledby="kit-builder-summary-heading" className="min-w-0 rounded-[8px] border border-primary/10 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="kit-builder-summary-heading" className="font-serif text-2xl text-forest">
          Resumen del kit
        </h2>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-semibold text-primary transition hover:text-cta-hover"
          >
            Vaciar
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Todavia no agregaste productos a tu kit.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex gap-3 rounded-lg border border-primary/10 p-2.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary/25">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-forest">{product.name}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    aria-label={`Quitar ${product.name} del kit`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition hover:bg-secondary/40 hover:text-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {quantity} × {formatPrice(product.price)}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-secondary/20 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => decrementItem(product.id)}
                      aria-label={`Quitar uno de ${product.name}`}
                      className="grid h-6 w-6 place-items-center rounded-full text-forest transition hover:bg-white hover:text-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-4 text-center text-xs font-bold text-forest">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementItem(product.id)}
                      aria-label={`Agregar uno de ${product.name}`}
                      className="grid h-6 w-6 place-items-center rounded-full bg-forest text-white transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-forest">{formatPrice(product.price * quantity)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-primary/10 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Total estimado</p>
            <p className="font-serif text-3xl text-forest">{formatPrice(total)}</p>
          </div>
          <p className="pb-1 text-xs text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddAllToCart}
          disabled={items.length === 0}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-3 text-sm font-bold text-white shadow-sm shadow-cta/20 transition duration-300 hover:scale-[1.01] hover:bg-cta-hover hover:shadow-md hover:shadow-cta/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4" />
          {added ? "¡Kit agregado al carrito!" : "Agregar kit al carrito"}
        </button>
      </div>
    </section>
  );
}
