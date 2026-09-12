"use client";

import Image from "next/image";
import { useCatalog } from "@/lib/useCatalog";
import { formatPrice } from "@/lib/utils";
import { useKitBuilderState } from "./KitBuilderState";

const MAX_ITEMS = 8;

export function KitBuilderCatalog() {
  const { products, isLoading } = useCatalog();
  const { addItem } = useKitBuilderState();

  if (isLoading) {
    return (
      <div className="rounded-[8px] border border-primary/10 bg-white p-5 text-sm text-muted">
        Cargando catalogo del kit...
      </div>
    );
  }

  return (
    <section aria-labelledby="kit-builder-catalog-heading" className="grid gap-3">
      <h2 id="kit-builder-catalog-heading" className="font-serif text-2xl text-forest">
        Elegi productos para tu kit
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {products.slice(0, MAX_ITEMS).map((product) => (
          <article key={product.id} className="overflow-hidden rounded-[8px] border border-primary/10 bg-white">
            <div className="relative aspect-[4/3] bg-secondary/30">
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="grid gap-3 p-4">
              <div>
                <p className="font-semibold text-forest">{product.name}</p>
                <p className="text-sm text-muted">{formatPrice(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => addItem(product)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-cta/20 transition duration-300 hover:scale-[1.03] hover:bg-cta-hover hover:shadow-md hover:shadow-cta/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Agregar al kit
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
