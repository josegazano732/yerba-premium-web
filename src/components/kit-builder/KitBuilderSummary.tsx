"use client";

import { formatPrice } from "@/lib/utils";
import { useKitBuilderState } from "./KitBuilderState";

export function KitBuilderSummary() {
  const { items, total, removeItem, clear } = useKitBuilderState();

  return (
    <section aria-labelledby="kit-builder-summary-heading" className="rounded-[8px] border border-primary/10 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="kit-builder-summary-heading" className="font-serif text-2xl text-forest">
          Resumen del kit
        </h2>
        {items.length > 0 ? (
          <button type="button" onClick={clear} className="text-sm font-semibold text-primary hover:text-cta-hover">
            Vaciar
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Todavia no agregaste productos a tu kit.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.product.id} className="flex items-start justify-between gap-3 rounded-md border border-primary/10 p-3">
              <div>
                <p className="font-semibold text-forest">{item.product.name}</p>
                <p className="text-sm text-muted">
                  {item.quantity} x {formatPrice(item.product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.product.id)}
                className="text-xs font-semibold text-primary hover:text-cta-hover"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-primary/10 pt-4">
        <p className="text-sm text-muted">Total estimado</p>
        <p className="font-serif text-3xl text-forest">{formatPrice(total)}</p>
      </div>
    </section>
  );
}
